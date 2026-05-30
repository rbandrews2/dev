import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizePayload } from "@/lib/security";

type TimeOffStatus = "pending" | "approved" | "denied";

type TimeOffRequest = {
  id: string;
  user_id: string;
  organization_id: string | null;
  start_date: string;
  end_date: string;
  type: string;
  status: TimeOffStatus;
  reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  requester_email?: string | null;
};

const TIME_OFF_TYPES = [
  "Vacation",
  "Sick",
  "Personal",
  "Unpaid",
  "Jury Duty",
  "Other",
];

const statusColors: Record<TimeOffStatus, string> = {
  pending: "bg-orange-500/20 text-orange-300 border-orange-400/60",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-400/60",
  denied: "bg-red-500/20 text-red-300 border-red-400/60",
};

const TimeOffPanel: React.FC = () => {
  const { user, organization, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<string>("Vacation");
  const [reason, setReason] = useState("");

  const [myRequests, setMyRequests] = useState<TimeOffRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<TimeOffRequest[]>([]);
  const [teamStatusFilter, setTeamStatusFilter] = useState<TimeOffStatus | "all">("pending");

  const [adminUpdatingId, setAdminUpdatingId] = useState<string | null>(null);

  const canSubmit = !!user && !!startDate && !!endDate && !!type && !submitting;

  const filteredTeamRequests = useMemo(() => {
    if (teamStatusFilter === "all") return teamRequests;
    return teamRequests.filter((r) => r.status === teamStatusFilter);
  }, [teamRequests, teamStatusFilter]);

  const loadMyRequests = async () => {
    if (!user) {
      setMyRequests([]);
      return;
    }
    const { data, error } = await supabase
      .from("time_off_requests")
      .select(
        "id, user_id, organization_id, start_date, end_date, type, status, reason, admin_notes, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });
    if (error) {
      console.error("Error loading my time-off requests:", error);
      return;
    }
    setMyRequests((data ?? []) as TimeOffRequest[]);
  };

  const loadTeamRequests = async () => {
    if (!isAdmin || !organization) {
      setTeamRequests([]);
      return;
    }
    const { data, error } = await supabase
      .from("time_off_requests_with_users")
      .select(
        "id, user_id, organization_id, start_date, end_date, type, status, reason, admin_notes, created_at, updated_at, requester_email"
      )
      .eq("organization_id", organization.id)
      .order("start_date", { ascending: false });
    if (error) {
      console.error("Error loading team time-off requests:", error);
      return;
    }
    setTeamRequests((data ?? []) as TimeOffRequest[]);
  };

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      await loadMyRequests();
      await loadTeamRequests();
      setLoading(false);
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
        start_date: startDate,
        end_date: endDate,
        type,
        reason: reason || null,
        status: "pending" as TimeOffStatus,
      });
      const { error } = await supabase.from("time_off_requests").insert(payload);
      if (error) {
        console.error("Error submitting time-off request:", error);
        return;
      }
      setStartDate("");
      setEndDate("");
      setType("Vacation");
      setReason("");
      await loadMyRequests();
      if (isAdmin && organization) {
        await loadTeamRequests();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (
    id: string,
    status: TimeOffStatus,
    notes?: string
  ) => {
    if (!isAdmin) return;
    try {
      setAdminUpdatingId(id);
      const { error } = await supabase
        .from("time_off_requests")
        .update(
          sanitizePayload({
            status,
            admin_notes: notes ?? null,
          })
        )
        .eq("id", id);
      if (error) {
        console.error("Error updating time-off status:", error);
        return;
      }
      await loadMyRequests();
      await loadTeamRequests();
    } finally {
      setAdminUpdatingId(null);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    if (!start && !end) return "-";
    if (start === end) return new Date(start).toLocaleDateString();
    return `${new Date(start).toLocaleDateString()} → ${new Date(end).toLocaleDateString()}`;
  };

  if (!user) {
    return (
      <Card className="bg-black/40 border border-orange-500/30 text-white p-6">
        <h3 className="text-xl font-semibold text-orange-300 mb-2">
          Time-Off Requests
        </h3>
        <p className="text-sm text-gray-300">
          You need to be signed in to request time off and view approvals.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <Card className="bg-black/40 border border-orange-500/30 text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-orange-300">
              Request Time Off
            </h3>
            <p className="text-xs sm:text-sm text-gray-300">
              Submit a request for vacation, sick time, or other leave. Your admin will review and approve or deny.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-orange-500/40 text-orange-200 text-[10px] sm:text-[11px] bg-black/40"
          >
            Signed in as {user.email ?? "user"}
          </Badge>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
        >
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Start date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">End date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Type</label>
            <Select
              value={type}
              onValueChange={(val) => setType(val)}
            >
              <SelectTrigger className="bg-black/60 border-gray-700 text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-black border-gray-800">
                {TIME_OFF_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-xs text-gray-300">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm min-h-[40px] max-h-[80px]"
              placeholder="Optional short note for your admin"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-orange-500 hover:bg-orange-400 text-black text-sm px-6"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Card>

      {/* My Requests */}
      <Card className="bg-black/40 border border-orange-500/30 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-orange-300">
            My Time-Off Requests
          </h3>
          <span className="text-[11px] text-gray-400">
            Showing {myRequests.length} request{myRequests.length === 1 ? "" : "s"}
          </span>
        </div>

        <ScrollArea className="h-[220px] sm:h-[260px] lg:h-[300px] pr-2">
          <div className="space-y-2">
            {myRequests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-gray-800 bg-black/60 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm text-gray-100">
                    {formatDateRange(r.start_date, r.end_date)}{" "}
                    <span className="text-gray-400">• {r.type}</span>
                  </p>
                  {r.reason && (
                    <p className="text-[11px] text-gray-400 line-clamp-2">
                      {r.reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 border ${statusColors[r.status]}`}
                  >
                    {r.status.toUpperCase()}
                  </Badge>
                  {r.admin_notes && (
                    <p className="text-[10px] text-gray-400 text-right line-clamp-2">
                      Admin: {r.admin_notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {myRequests.length === 0 && (
              <p className="text-xs text-gray-400">
                No time-off requests yet. Submit your first request above.
              </p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Admin: Team Requests */}
      {isAdmin && organization && (
        <Card className="bg-black/40 border border-orange-500/30 text-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-orange-300">
                Team Time-Off Requests
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                View and manage requests for your organization: {organization.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Status filter:</span>
              <Select
                value={teamStatusFilter}
                onValueChange={(val) => setTeamStatusFilter(val as TimeOffStatus | "all")}
              >
                <SelectTrigger className="bg-black/60 border-gray-700 text-[11px] w-[130px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-800">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[260px] sm:h-[320px] pr-2">
            <div className="space-y-2">
              {filteredTeamRequests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-800 bg-black/60 px-3 py-2 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-gray-100">
                        {formatDateRange(r.start_date, r.end_date)}{" "}
                        <span className="text-gray-400">• {r.type}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Requested by {r.requester_email ?? r.user_id}
                      </p>
                      {r.reason && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">
                          Reason: {r.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 border ${statusColors[r.status]}`}
                      >
                        {r.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Textarea
                      defaultValue={r.admin_notes ?? ""}
                      placeholder="Optional admin notes"
                      className="bg-black/60 border-gray-700 text-[11px] min-h-[40px] max-h-[80px]"
                      onBlur={async (e) => {
                        const nextNotes = e.target.value.trim() || undefined;
                        if (nextNotes !== (r.admin_notes ?? undefined)) {
                          await updateRequestStatus(r.id, r.status, nextNotes);
                        }
                      }}
                    />
                    <div className="flex flex-row sm:flex-col gap-2 justify-end sm:items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/20 text-[11px] px-3"
                        disabled={adminUpdatingId === r.id}
                        onClick={() => updateRequestStatus(r.id, "approved", r.admin_notes ?? undefined)}
                      >
                        {adminUpdatingId === r.id && r.status === "approved"
                          ? "Saving..."
                          : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-500/60 text-red-300 hover:bg-red-500/20 text-[11px] px-3"
                        disabled={adminUpdatingId === r.id}
                        onClick={() => updateRequestStatus(r.id, "denied", r.admin_notes ?? undefined)}
                      >
                        {adminUpdatingId === r.id && r.status === "denied"
                          ? "Saving..."
                          : "Deny"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTeamRequests.length === 0 && (
                <p className="text-xs text-gray-400">
                  No team requests match this filter.
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default TimeOffPanel;
