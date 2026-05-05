import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizePayload } from "@/lib/security";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type IncidentSeverity = "minor" | "moderate" | "severe";
type IncidentStatus = "open" | "under-review" | "closed";

type Incident = {
  id: string;
  user_id: string;
  organization_id: string | null;
  occurred_at: string;
  location: string | null;
  type: string;
  severity: IncidentSeverity;
  description: string;
  immediate_actions: string | null;
  status: IncidentStatus;
  follow_up_actions: string | null;
  created_at: string;
  updated_at: string | null;
  reporter_email?: string | null;
};

const SEVERITY_OPTIONS: IncidentSeverity[] = ["minor", "moderate", "severe"];
const STATUS_FILTERS: (IncidentStatus | "all")[] = ["all", "open", "under-review", "closed"];

const severityBadgeClasses: Record<IncidentSeverity, string> = {
  minor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/60",
  moderate: "bg-amber-500/20 text-amber-300 border-amber-400/60",
  severe: "bg-red-500/20 text-red-300 border-red-400/60",
};

const statusBadgeClasses: Record<IncidentStatus, string> = {
  open: "bg-red-500/20 text-red-300 border-red-400/60",
  "under-review": "bg-amber-500/20 text-amber-300 border-amber-400/60",
  closed: "bg-emerald-500/20 text-emerald-300 border-emerald-400/60",
};

const IncidentReportsPanel: React.FC = () => {
  const { user, organization, isAdmin } = useAuth();

  const [occurredAt, setOccurredAt] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [severity, setSeverity] = useState<IncidentSeverity>("moderate");
  const [description, setDescription] = useState<string>("");
  const [immediateActions, setImmediateActions] = useState<string>("");

  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [orgIncidents, setOrgIncidents] = useState<Incident[]>([]);
  const [orgStatusFilter, setOrgStatusFilter] = useState<IncidentStatus | "all">("open");

  const [submitting, setSubmitting] = useState(false);
  const [adminUpdatingId, setAdminUpdatingId] = useState<string | null>(null);

  const canSubmit =
    user &&
    description.trim().length > 10 &&
    (type.trim().length > 0) &&
    !submitting;

  const filteredOrgIncidents = useMemo(() => {
    if (orgStatusFilter === "all") return orgIncidents;
    return orgIncidents.filter((i) => i.status === orgStatusFilter);
  }, [orgIncidents, orgStatusFilter]);

  const formatDateTime = (value: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const loadMyIncidents = async () => {
    if (!user) {
      setMyIncidents([]);
      return;
    }
    const { data, error } = await supabase
      .from("incidents")
      .select(
        "id, user_id, organization_id, occurred_at, location, type, severity, description, immediate_actions, status, follow_up_actions, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false });
    if (error) {
      console.error("Error loading incidents:", error);
      return;
    }
    setMyIncidents((data ?? []) as Incident[]);
  };

  const loadOrgIncidents = async () => {
    if (!organization || !isAdmin) {
      setOrgIncidents([]);
      return;
    }
    const { data, error } = await supabase
      .from("incidents_with_users")
      .select(
        "id, user_id, organization_id, occurred_at, location, type, severity, description, immediate_actions, status, follow_up_actions, created_at, updated_at, reporter_email"
      )
      .eq("organization_id", organization.id)
      .order("occurred_at", { ascending: false });
    if (error) {
      console.error("Error loading org incidents:", error);
      return;
    }
    setOrgIncidents((data ?? []) as Incident[]);
  };

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      await loadMyIncidents();
      await loadOrgIncidents();
    };
    void init();
  }, [user?.id, organization?.id, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    try {
      setSubmitting(true);
      const payload = sanitizePayload({
        user_id: user.id,
        organization_id: organization?.id ?? null,
        occurred_at: occurredAt || new Date().toISOString(),
        location: location || null,
        type: type || "Unspecified",
        severity,
        description,
        immediate_actions: immediateActions || null,
        status: "open" as IncidentStatus,
      });
      const { error } = await supabase.from("incidents").insert(payload);
      if (error) {
        console.error("Error submitting incident:", error);
        return;
      }
      setOccurredAt("");
      setLocation("");
      setType("");
      setSeverity("moderate");
      setDescription("");
      setImmediateActions("");
      await loadMyIncidents();
      await loadOrgIncidents();
    } finally {
      setSubmitting(false);
    }
  };

  const updateIncidentStatus = async (
    id: string,
    status: IncidentStatus,
    followUp?: string
  ) => {
    if (!isAdmin) return;
    try {
      setAdminUpdatingId(id);
      const { error } = await supabase
        .from("incidents")
        .update(
          sanitizePayload({
            status,
            follow_up_actions: followUp ?? null,
          })
        )
        .eq("id", id);
      if (error) {
        console.error("Error updating incident:", error);
        return;
      }
      await loadMyIncidents();
      await loadOrgIncidents();
    } finally {
      setAdminUpdatingId(null);
    }
  };

  if (!user) {
    return (
      <Card className="bg-black/40 border border-red-500/40 text-white p-6">
        <h3 className="text-xl font-semibold text-red-300 mb-2">
          Incident Reports
        </h3>
        <p className="text-sm text-gray-300">
          You need to be signed in to report incidents and near misses.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Submit Incident */}
      <Card className="bg-black/40 border border-red-500/40 text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-red-300">
              Report an Incident or Near Miss
            </h3>
            <p className="text-xs sm:text-sm text-gray-300">
              Capture what happened, where, when, and how it was handled. This helps leadership spot patterns and improve work zone safety.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-red-500/60 text-red-200 text-[10px] sm:text-[11px] bg-black/40"
          >
            Logged in as {user.email ?? "user"}
          </Badge>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start"
        >
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Date & time</label>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Location / Job</label>
            <Input
              placeholder="e.g. I-81 NB mm 145, night paving"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Incident type</label>
            <Input
              placeholder="e.g. Near miss, Struck-by, PPE, Equipment"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Severity</label>
            <Select
              value={severity}
              onValueChange={(val) => setSeverity(val as IncidentSeverity)}
            >
              <SelectTrigger className="bg-black/60 border-gray-700 text-sm">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent className="bg-black border-gray-800">
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2 lg:col-span-2">
            <label className="text-xs text-gray-300">What happened?</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm min-h-[80px]"
              placeholder="Describe what happened in clear, factual language"
              required
            />
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-2">
            <label className="text-xs text-gray-300">
              Immediate controls / actions (optional)
            </label>
            <Textarea
              value={immediateActions}
              onChange={(e) => setImmediateActions(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm min-h-[80px]"
              placeholder="e.g. traffic stopped, crew removed from hazard, emergency services called"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-red-500 hover:bg-red-400 text-black text-sm px-6"
            >
              {submitting ? "Submitting..." : "Submit Incident"}
            </Button>
          </div>
        </form>
      </Card>

      {/* My Incident Reports */}
      <Card className="bg-black/40 border border-red-500/30 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-red-300">
            My Incident & Near-Miss Reports
          </h3>
          <span className="text-[11px] text-gray-400">
            {myIncidents.length} report{myIncidents.length === 1 ? "" : "s"}
          </span>
        </div>
        <ScrollArea className="h-[220px] sm:h-[260px] lg:h-[300px] pr-2">
          <div className="space-y-2">
            {myIncidents.map((i) => (
              <div
                key={i.id}
                className="rounded-lg border border-gray-800 bg-black/60 px-3 py-2 space-y-1"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-100">
                      {formatDateTime(i.occurred_at)}{" "}
                      {i.location && (
                        <span className="text-gray-400">• {i.location}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-300">
                      {i.type} • Severity:{" "}
                      <span className="capitalize">{i.severity}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 border ${statusBadgeClasses[i.status]}`}
                    >
                      {i.status.toUpperCase().replace("-", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 border ${severityBadgeClasses[i.severity]}`}
                    >
                      {i.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-3">
                  {i.description}
                </p>
                {i.follow_up_actions && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Follow up: {i.follow_up_actions}
                  </p>
                )}
              </div>
            ))}
            {myIncidents.length === 0 && (
              <p className="text-xs text-gray-400">
                No incident reports yet. Use the form above to log your first report.
              </p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Org Incidents for Admins */}
      {isAdmin && organization && (
        <Card className="bg-black/40 border border-red-500/30 text-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-red-300">
                Organization Incident Log
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                All incident and near-miss reports for {organization.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Status filter:</span>
              <Select
                value={orgStatusFilter}
                onValueChange={(val) =>
                  setOrgStatusFilter(val as IncidentStatus | "all")
                }
              >
                <SelectTrigger className="bg-black/60 border-gray-700 text-[11px] w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-800">
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all"
                        ? "All"
                        : s === "under-review"
                        ? "Under Review"
                        : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[260px] sm:h-[320px] pr-2">
            <div className="space-y-2">
              {filteredOrgIncidents.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border border-gray-800 bg-black/60 px-3 py-2 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-gray-100">
                        {formatDateTime(i.occurred_at)}{" "}
                        {i.location && (
                          <span className="text-gray-400">• {i.location}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Type: {i.type} • Severity:{" "}
                        <span className="capitalize">{i.severity}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Reporter: {i.reporter_email ?? i.user_id}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 border ${statusBadgeClasses[i.status]}`}
                      >
                        {i.status.toUpperCase().replace("-", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 border ${severityBadgeClasses[i.severity]}`}
                      >
                        {i.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                    <Textarea
                      defaultValue={i.follow_up_actions ?? ""}
                      placeholder="Admin follow-up actions / notes"
                      className="bg-black/60 border-gray-700 text-[11px] min-h-[40px] max-h-[80px]"
                      onBlur={async (e) => {
                        const next = e.target.value.trim() || undefined;
                        if (next !== (i.follow_up_actions ?? undefined)) {
                          await updateIncidentStatus(i.id, i.status, next);
                        }
                      }}
                    />
                    <div className="flex flex-row sm:flex-col gap-2 justify-end sm:items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-amber-500/60 text-amber-300 hover:bg-amber-500/20 text-[11px] px-3"
                        disabled={adminUpdatingId === i.id}
                        onClick={() =>
                          updateIncidentStatus(
                            i.id,
                            "under-review",
                            i.follow_up_actions ?? undefined
                          )
                        }
                      >
                        {adminUpdatingId === i.id && i.status === "under-review"
                          ? "Saving..."
                          : "Mark Under Review"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/20 text-[11px] px-3"
                        disabled={adminUpdatingId === i.id}
                        onClick={() =>
                          updateIncidentStatus(
                            i.id,
                            "closed",
                            i.follow_up_actions ?? undefined
                          )
                        }
                      >
                        {adminUpdatingId === i.id && i.status === "closed"
                          ? "Saving..."
                          : "Close"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredOrgIncidents.length === 0 && (
                <p className="text-xs text-gray-400">
                  No incident reports match this filter.
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default IncidentReportsPanel;
