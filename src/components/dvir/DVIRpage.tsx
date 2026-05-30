import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { sanitizePayload } from "@/lib/security";
import AiAvatar from "@/components/assistant/AiAvatar";
import { useAssistant } from "@/contexts/AssistantContext";

type TripType = "pre-trip" | "post-trip";
type InspectionResult = "pass" | "fail";

interface DvirRecord {
  id: string;
  vehicle_id: string;
  odometer: number | null;
  trip_type: TripType | null;
  defects: string | null;
  comments: string | null;
  tires_result: InspectionResult | null;
  fluids_result: InspectionResult | null;
  brakes_result: InspectionResult | null;
  ebrake_result: InspectionResult | null;
  mirrors_result: InspectionResult | null;
  windows_result: InspectionResult | null;
  created_at: string;
}

interface InspectionState {
  tires: InspectionResult | "";
  fluids: InspectionResult | "";
  brakes: InspectionResult | "";
  ebrake: InspectionResult | "";
  mirrors: InspectionResult | "";
  windows: InspectionResult | "";
}

const emptyInspectionState: InspectionState = {
  tires: "",
  fluids: "",
  brakes: "",
  ebrake: "",
  mirrors: "",
  windows: "",
};

const DVIRContent: React.FC = () => {
  const { updateFormContext, logAction } = useAssistant();
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [tripType, setTripType] = useState<TripType>("pre-trip");
  const [defects, setDefects] = useState("");
  const [comments, setComments] = useState("");
  const [inspection, setInspection] = useState<InspectionState>(emptyInspectionState);

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [recentInspections, setRecentInspections] = useState<DvirRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function loadRecent() {
    try {
      setLoadingList(true);
      setListError(null);

      const { data, error } = await supabase
        .from("dvir_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading DVIR records:", error);
        setListError(
          "Unable to load recent DVIRs. Once the Supabase table `dvir_reports` exists with the expected columns, this list will populate automatically."
        );
        setRecentInspections([]);
        return;
      }

      setRecentInspections((data ?? []) as DvirRecord[]);
    } catch (err) {
      console.error("Unexpected error loading DVIR records:", err);
      setListError("Unexpected error while loading DVIR history.");
      setRecentInspections([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  useEffect(() => {
    updateFormContext({
      form: "DVIR",
      vehicleId,
      odometer,
      tripType,
      inspection,
      defectsPreview: defects.slice(0, 120),
    });
  }, [vehicleId, odometer, tripType, inspection, defects, updateFormContext]);

  const validateChecklist = () => {
    const missing = Object.entries(inspection)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      setSubmitError(
        "Please select Pass or Fail for all inspection items (Tires, Fluids, Brakes, E-Brake, Mirrors, Windows)."
      );
      return false;
    }
    return true;
  };

  const handleInspectionChange = (field: keyof InspectionState, value: InspectionResult) => {
    setInspection((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      if (!vehicleId.trim()) {
        setSubmitError("Vehicle ID is required.");
        setSubmitting(false);
        return;
      }

      if (!validateChecklist()) {
        setSubmitting(false);
        return;
      }

      const payload = sanitizePayload({
        vehicle_id: vehicleId.trim(),
        odometer: odometer ? Number(odometer) : null,
        trip_type: tripType,
        defects: defects.trim() || null,
        comments: comments.trim() || null,
        tires_result: inspection.tires || null,
        fluids_result: inspection.fluids || null,
        brakes_result: inspection.brakes || null,
        ebrake_result: inspection.ebrake || null,
        mirrors_result: inspection.mirrors || null,
        windows_result: inspection.windows || null,
      });

      const { error } = await supabase.from("dvir_reports").insert(payload);

      if (error) {
        console.error("Error submitting DVIR:", error);
        setSubmitError(
          "Error submitting DVIR. Confirm that the `dvir_reports` table exists in Supabase and has the expected columns."
        );
        toast.success("Submitted (Demo Mode)");
      } else {
        setSubmitMessage("DVIR submitted successfully.");
        setVehicleId("");
        setOdometer("");
        setDefects("");
        setComments("");
        setInspection(emptyInspectionState);
        toast.success("DVIR submitted");
        logAction("Submitted DVIR");
        await loadRecent();
      }
    } catch (err) {
      console.error("Unexpected error submitting DVIR:", err);
      setSubmitError("Unexpected error while submitting DVIR.");
      toast.success("Submitted (Demo Mode)");
      logAction("DVIR submit (demo)");
    } finally {
      setSubmitting(false);
    }
  };

  const renderInspectionRow = (label: string, field: keyof InspectionState) => (
    <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-black/60 px-3 py-2">
      <span className="text-xs font-medium text-gray-200">{label}</span>
      <div className="flex gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => handleInspectionChange(field, "pass")}
          className={`px-2 py-1 rounded-md border text-[11px] ${
            inspection[field] === "pass"
              ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
              : "border-gray-600 bg-black/40 text-gray-300 hover:border-emerald-400"
          }`}
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => handleInspectionChange(field, "fail")}
          className={`px-2 py-1 rounded-md border text-[11px] ${
            inspection[field] === "fail"
              ? "border-red-400 bg-red-500/20 text-red-200"
              : "border-gray-600 bg-black/40 text-gray-300 hover:border-red-400"
          }`}
        >
          Fail
        </button>
      </div>
    </div>
  );

  const formatChecklist = (record: DvirRecord) => {
    const items: string[] = [];

    const push = (name: string, value: InspectionResult | null) => {
      if (!value) return;
      items.push(`${name}: ${value === "pass" ? "Pass" : "Fail"}`);
    };

    push("Tires", record.tires_result);
    push("Fluids", record.fluids_result);
    push("Brakes", record.brakes_result);
    push("E-Brake", record.ebrake_result);
    push("Mirrors", record.mirrors_result);
    push("Windows", record.windows_result);

    return items.join(" • ");
  };

  return (
    <div className="text-white">
      {/* Main DVIR content */}
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-8 sm:px-6 lg:px-8">
        <section>
          <h1 className="text-3xl font-bold text-white tracking-tight">DVIR</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Digital Vehicle Inspection Reports for every shift. This form captures required pass/fail checks and comments
            to support DOT and insurance recordkeeping.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-black/60 px-3 py-2 text-xs text-orange-100">
            <AiAvatar size={28} />
            <div className="leading-tight">
              <p className="font-semibold text-orange-200">Atlas AI active</p>
              <p className="text-orange-100/75">Use the floating button (bottom right) for DVIR help and safety tips.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
          {/* DVIR form */}
          <div className="rounded-2xl border border-orange-500/30 bg-black/70 p-6 shadow-[0_0_40px_rgba(15,23,42,0.9)] space-y-5">
            <h2 className="text-lg font-semibold text-orange-300">New DVIR</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Vehicle ID / Unit #
                </label>
                <input
                  type="text"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full rounded-lg border border-orange-500/40 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. TRK-102, Unit 45"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Odometer
                  </label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/40 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. 124503"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Trip Type
                  </label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as TripType)}
                    className="w-full rounded-lg border border-orange-500/40 bg-black/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="pre-trip">Pre-trip</option>
                    <option value="post-trip">Post-trip</option>
                  </select>
                </div>
              </div>

              {/* Inspection checklist */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-orange-300">
                  Required Inspection Items (Pass/Fail)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {renderInspectionRow("Tires", "tires")}
                  {renderInspectionRow("Fluids", "fluids")}
                  {renderInspectionRow("Brakes", "brakes")}
                  {renderInspectionRow("E-Brake", "ebrake")}
                  {renderInspectionRow("Mirrors", "mirrors")}
                  {renderInspectionRow("Windows", "windows")}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Defects (describe any failed items)
                </label>
                <textarea
                  value={defects}
                  onChange={(e) => setDefects(e.target.value)}
                  className="w-full rounded-lg border border-orange-500/40 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                  placeholder="Detail any failed items and defect notes."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Comments / Notes
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full rounded-lg border border-orange-500/40 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[60px]"
                  placeholder="Additional notes for fleet, safety, or maintenance (optional)."
                />
              </div>

              {submitError && (
                <p className="text-xs text-red-400">{submitError}</p>
              )}
              {submitMessage && (
                <p className="text-xs text-emerald-400">{submitMessage}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-orange-500 text-black text-sm font-semibold py-2.5 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting DVIR..." : "Submit DVIR"}
              </button>
            </form>

            <p className="mt-3 text-[10px] text-gray-500">
              Supabase table recommendation for <code>dvir_reports</code>: vehicle_id text, odometer numeric, trip_type
              text, defects text, comments text, tires_result text, fluids_result text, brakes_result text, ebrake_result
              text, mirrors_result text, windows_result text, created_at timestamptz default now().
            </p>
          </div>

          {/* Recent DVIRs */}
          <div className="rounded-2xl border border-orange-500/10 bg-black/50 p-6">
            <h2 className="text-sm font-semibold text-orange-300 mb-3">Recent DVIRs</h2>
            {loadingList ? (
              <p className="text-xs text-gray-400">Loading recent inspections...</p>
            ) : listError ? (
              <p className="text-xs text-red-400 whitespace-pre-line">{listError}</p>
            ) : recentInspections.length === 0 ? (
              <p className="text-xs text-gray-400">
                No DVIRs found yet. Once you start submitting inspections, the 10 most recent will appear here.
              </p>
            ) : (
              <ul className="space-y-3 text-xs text-gray-200">
                {recentInspections.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-lg border border-orange-500/20 bg-black/60 px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-orange-200">{record.vehicle_id}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[11px] text-gray-300">
                        {record.trip_type === "pre-trip" ? "Pre-trip" : "Post-trip"}
                      </span>
                      {typeof record.odometer === "number" && (
                        <span className="text-[11px] text-gray-400">
                          Odometer: {record.odometer.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-300">
                      Checklist: {formatChecklist(record) || "n/a"}
                    </div>
                    {record.defects && (
                      <p className="text-[11px] text-red-300">Defects: {record.defects}</p>
                    )}
                    {record.comments && (
                      <p className="text-[11px] text-gray-300">Comments: {record.comments}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const DVIRpage: React.FC = () => {
  return <DVIRContent />;
};

export default DVIRpage;
