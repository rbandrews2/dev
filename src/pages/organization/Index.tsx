import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AuthLandingCard from "@/components/auth/AuthLandingCard";

type Mode = "create" | "manage";
type MemberRole = "admin" | "member";
type CsvRow = { email: string; role: MemberRole };
type ErrorLike = { message?: string };
type CreateOrgRpcRow = { organization_id?: string };

const INDUSTRY_OPTIONS = ["Road Crew", "Construction", "Striping", "Other"];
const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "200+"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function extractErrorMessage(error: unknown, fallback: string) {
  const message = (error as ErrorLike | null)?.message || fallback;
  if (typeof message !== "string") return fallback;
  if (message.includes("created_by") && message.includes("organizations")) {
    return "Supabase is missing the organizations.created_by column. Apply src/sql/organization_onboarding_fix.sql and retry.";
  }
  if (message.includes("org_activation_code")) {
    return "Supabase is missing the access-code organization gate. Apply src/sql/organization_access_code_gate.sql and retry.";
  }
  return message;
}

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

type OrganizationIndexProps = {
  adminMode?: boolean;
};

export default function OrganizationIndex({ adminMode = false }: OrganizationIndexProps) {
  const { user, organization, orgMemberships, activeOrgId, refreshOrganization, signOut } = useAuth();
  const [name, setName] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [industry, setIndustry] = useState<string | undefined>();
  const [companySize, setCompanySize] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [processingCsv, setProcessingCsv] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const navigate = useNavigate();

  const hasMembership = orgMemberships.length > 0;
  const mode: Mode = hasMembership ? "manage" : "create";
  const activeMembership =
    orgMemberships.find((m) => m.organization_id === activeOrgId) ?? orgMemberships[0];
  const normalizedActivationCode = activationCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const canSubmit = name.trim().length >= 2 && normalizedActivationCode.length === 15 && !submitting;
  const isPrivileged = adminMode && (activeMembership?.role === "owner" || activeMembership?.role === "admin");
  const orgId = activeMembership?.organization_id || organization?.id || null;

  const refreshOrganizationWithRetry = async (expectedOrgId?: string | null) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const memberships = await refreshOrganization();
      if (!expectedOrgId || memberships.some((membership) => membership.organization_id === expectedOrgId)) {
        return memberships;
      }
      await wait(250 * (attempt + 1));
    }
    return [];
  };

  const roleLabel = useMemo(() => {
    const role = activeMembership?.role ?? "member";
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    return "Member";
  }, [activeMembership?.role]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You need to be signed in to create an organization.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Organization name must be at least 2 characters.");
      return;
    }
    if (normalizedActivationCode.length !== 15) {
      setError("Enter the 15-character access code from your purchase.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleanName = name.trim();
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_organization_with_owner",
        {
          org_name: cleanName,
          org_industry: industry || null,
          org_company_size: companySize || null,
          org_activation_code: normalizedActivationCode,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const createdOrgId =
        Array.isArray(rpcData) && rpcData[0]?.organization_id
          ? String(rpcData[0].organization_id)
          : (rpcData as CreateOrgRpcRow | null)?.organization_id
          ? String((rpcData as CreateOrgRpcRow).organization_id)
          : null;

      if (!createdOrgId) {
        throw new Error("Organization was created, but no organization id was returned.");
      }

      toast.success("Organization created");
      setActivationCode("");
      const memberships = await refreshOrganizationWithRetry(createdOrgId);
      if (!memberships.length) {
        throw new Error("Organization created but membership could not be confirmed.");
      }
      navigate("/", { replace: true });
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "We could not create your organization right now. Please try again."
      );
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatActivationCode = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 15);
    const parts: string[] = [];
    for (let i = 0; i < cleaned.length; i += 5) {
      parts.push(cleaned.slice(i, i + 5));
    }
    return parts.join(" ");
  };

  const handleManualAdd = async (e: FormEvent) => {
    e.preventDefault();
    setMemberError(null);
    if (!user) {
      setMemberError("Sign in to add members.");
      return;
    }
    if (!orgId) {
      setMemberError("No active organization found.");
      return;
    }
    if (!isPrivileged) {
      setMemberError("Only owners and admins can add members.");
      return;
    }
    const email = normalizeEmail(memberEmail);
    const name = memberName.trim();
    if (!email) {
      setMemberError("Enter an email.");
      return;
    }

    setAddingMember(true);
    try {
      const { error: insertError } = await supabase
        .from("organization_members")
        .upsert(
          {
            organization_id: orgId,
            email,
            role: memberRole,
            member_name: name || null,
          },
          { onConflict: "organization_id,email" }
        );
      if (insertError) {
        throw insertError;
      }
      toast.success("Member added", { description: email });
      setMemberEmail("");
      setMemberName("");
    } catch (err) {
      setMemberError(extractErrorMessage(err, "Could not add member."));
    } finally {
      setAddingMember(false);
    }
  };

  const parseCsv = async (file: File) => {
    setProcessingCsv(true);
    setCsvError(null);
    setCsvRows([]);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        throw new Error("CSV must include a header row and at least one entry.");
      }
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().toLowerCase());
      const emailIdx = headers.indexOf("email");
      const roleIdx = headers.indexOf("role");
      if (emailIdx === -1 || roleIdx === -1) {
        throw new Error("CSV needs columns: email, role");
      }
      const dedupedRows = new Map<string, CsvRow>();
      for (const line of lines.slice(1)) {
        const cols = line.split(",").map((c) => c.trim());
        const email = normalizeEmail(cols[emailIdx] || "");
        const role = (cols[roleIdx] || "").toLowerCase();
        if (!email || (role !== "admin" && role !== "member")) {
          continue;
        }
        dedupedRows.set(email, { email, role });
      }
      const rows = Array.from(dedupedRows.values());
      if (!rows.length) {
        throw new Error("No valid rows found. Roles must be admin or member.");
      }
      setCsvRows(rows);
      setCsvFileName(file.name);
    } catch (err) {
      setCsvError((err as ErrorLike | null)?.message ?? "Could not read CSV.");
    } finally {
      setProcessingCsv(false);
    }
  };

  const handleCsvSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseCsv(file);
  };

  const handleBulkAdd = async () => {
    setCsvError(null);
    if (!user) {
      setCsvError("Sign in to add members.");
      return;
    }
    if (!orgId) {
      setCsvError("No active organization found.");
      return;
    }
    if (!isPrivileged) {
      setCsvError("Only owners and admins can add members.");
      return;
    }
    if (!csvRows.length) {
      setCsvError("Upload a CSV with email and role first.");
      return;
    }
    setBulkAdding(true);
    try {
      const payload = csvRows.map((row) => ({
        organization_id: orgId,
        email: row.email,
        role: row.role,
      }));
      const { error: insertError } = await supabase
        .from("organization_members")
        .upsert(payload, { onConflict: "organization_id,email" });
      if (insertError) throw insertError;
      toast.success("Members added", {
        description: `${csvRows.length} member${csvRows.length === 1 ? "" : "s"} imported`,
      });
      setCsvRows([]);
      setCsvFileName("");
    } catch (err) {
      setCsvError(extractErrorMessage(err, "Could not import CSV."));
    } finally {
      setBulkAdding(false);
    }
  };

  const renderCreate = () => (
    <GlassCard className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-orange-500/40 bg-orange-500/10 flex items-center justify-center text-orange-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-orange-100/80">Create Organization</p>
          <p className="text-lg font-semibold text-white">
            Enter your purchased access code to permanently unlock this organization.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name" className="text-sm text-orange-50">
            Organization name
          </Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sunrise Highway Contractors"
            className="bg-black/60 border-orange-500/30 text-white"
            disabled={submitting || !user}
            required
          />
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-orange-50">Industry (optional)</Label>
            <Select
              value={industry}
              onValueChange={(val) => setIndustry(val)}
              disabled={submitting || !user}
            >
              <SelectTrigger className="bg-black/60 border-orange-500/30 text-white">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-orange-500/20">
                {INDUSTRY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-orange-50">Company size (optional)</Label>
            <Select
              value={companySize}
              onValueChange={(val) => setCompanySize(val)}
              disabled={submitting || !user}
            >
              <SelectTrigger className="bg-black/60 border-orange-500/30 text-white">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-orange-500/20">
                {COMPANY_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-activation-code" className="text-sm text-orange-50">
            Access / activation code
          </Label>
          <Input
            id="org-activation-code"
            value={activationCode}
            onChange={(e) => setActivationCode(formatActivationCode(e.target.value))}
            placeholder="ABCDE 12345 FGHIJ"
            className="bg-black/60 border-orange-500/30 text-white text-center tracking-[0.22em]"
            disabled={submitting || !user}
            maxLength={17}
            required
          />
          <p className="text-xs text-orange-100/70">
            This code is permanently attached to this organization and all accounts added under it.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-orange-500/20">
          <Button
            type="button"
            variant="ghost"
            className="text-orange-200 hover:text-white"
            onClick={() => signOut()}
            disabled={submitting}
          >
            Sign out
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || !user}
            className="bg-orange-500 hover:bg-orange-400 text-black px-6"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Organization"
            )}
          </Button>
        </div>
      </form>
    </GlassCard>
  );

  const renderMemberManagement = () => (
    <GlassCard className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl border border-orange-500/40 bg-orange-500/10 flex items-center justify-center text-orange-200">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-orange-100/80">Add members</p>
          <p className="text-lg font-semibold text-white">
            Invite admins or members by email
          </p>
          <p className="text-xs text-orange-100/70">
            Only owners/admins can add members. CSV must include email and role (admin or member).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-orange-500/20 bg-black/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-orange-300" />
            <p className="text-sm font-semibold text-white">Single entry</p>
          </div>
          <form onSubmit={handleManualAdd} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-orange-50">Name (optional)</Label>
              <Input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Full name"
                className="bg-black/60 border-orange-500/30 text-white"
                disabled={!isPrivileged || addingMember}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-orange-50">Email</Label>
              <Input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="crew.member@company.com"
                className="bg-black/60 border-orange-500/30 text-white"
                disabled={!isPrivileged || addingMember}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-orange-50">Role</Label>
              <Select
                value={memberRole}
                onValueChange={(val: "admin" | "member") => setMemberRole(val)}
                disabled={!isPrivileged || addingMember}
              >
                <SelectTrigger className="bg-black/60 border-orange-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 text-white border-orange-500/20">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {memberError && (
              <p className="text-sm text-red-400" role="alert">
                {memberError}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!isPrivileged || addingMember || !memberEmail}
                className="bg-orange-500 hover:bg-orange-400 text-black"
              >
                {addingMember ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </span>
                ) : (
                  "Add member"
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-black/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-orange-300" />
            <p className="text-sm font-semibold text-white">Upload CSV</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-orange-50">CSV file</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvSelect}
                disabled={!isPrivileged || processingCsv}
                className="bg-black/60 border-orange-500/30 text-white"
              />
              <UploadCloud className="h-5 w-5 text-orange-300" />
            </div>
            <p className="text-xs text-orange-100/70">
              Required columns: email, role. Roles must be admin or member.
            </p>
            {csvFileName && (
              <p className="text-xs text-orange-200">Selected: {csvFileName}</p>
            )}
            {csvRows.length > 0 && (
              <div className="rounded-lg border border-orange-500/20 bg-black/50 p-3 space-y-2 max-h-40 overflow-y-auto">
                <p className="text-xs text-orange-200">
                  Preview ({csvRows.length}):
                </p>
                {csvRows.map((row, idx) => (
                  <p key={`${row.email}-${idx}`} className="text-xs text-orange-100/80">
                    {row.email} - {row.role}
                  </p>
                ))}
              </div>
            )}
            {csvError && (
              <p className="text-sm text-red-400" role="alert">
                {csvError}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleBulkAdd}
              disabled={!isPrivileged || bulkAdding || !csvRows.length}
              className="bg-orange-500 hover:bg-orange-400 text-black"
            >
              {bulkAdding ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </span>
              ) : (
                `Add ${csvRows.length || ""} member${csvRows.length === 1 ? "" : "s"}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  const renderManage = () => {
    const orgName =
      activeMembership?.organization?.name ||
      organization?.name ||
      "Organization";
    const orgIdDisplay = activeMembership?.organization_id || organization?.id || "N/A";
    const accessIdDisplay =
      activeMembership?.organization?.activation_code_id ||
      organization?.activation_code_id ||
      "N/A";

    return (
      <>
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-orange-100/80">Organization</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-300" />
                <h2 className="text-2xl font-semibold text-white">{orgName}</h2>
              </div>
              <p className="text-xs text-orange-100/70">ID: {orgIdDisplay}</p>
              <p className="text-xs text-orange-100/70">Access / activation code ID: {accessIdDisplay}</p>
            </div>
            <Badge className="bg-orange-500/15 text-orange-200 border border-orange-500/40">
              {roleLabel}
            </Badge>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-black/60 p-4 space-y-2">
            <p className="text-sm text-orange-100/80">
              You&apos;re connected to this workspace. Use the dashboard to access forms, messaging,
              navigation, and scheduling with your organization context applied.
            </p>
            <p className="text-xs text-orange-100/60">
              Need a different workspace? Switching and invites will be added once multi-org is enabled.
            </p>
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-orange-500/40 text-orange-100 hover:bg-orange-500/10"
              onClick={() => navigate("/")}
            >
              Go to Dashboard
            </Button>
          </div>
        </GlassCard>

        {adminMode && renderMemberManagement()}
      </>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">
            Organization
          </p>
          <h1 className="text-2xl font-semibold text-white mt-1">
            {mode === "create" ? "Create your organization" : "Organization settings"}
          </h1>
          <p className="text-sm text-orange-100/75">
            {mode === "create"
              ? "We'll keep this short - name it and you're in."
              : "Manage your workspace details and access points."}
          </p>
        </div>
        {mode === "manage" && (
          <Button
            type="button"
            variant="ghost"
            className="text-orange-200 hover:text-white"
            onClick={() => navigate("/")}
          >
            Dashboard
          </Button>
        )}
      </div>

      {!user && (
        <AuthLandingCard
          title="Sign in to create your organization"
          subtitle="Sign in or create an account to start an organization and add your team."
        />
      )}

      {mode === "create" ? renderCreate() : renderManage()}
    </div>
  );
}


