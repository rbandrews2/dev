"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SignInGate from "@/components/auth/SignInGate";
import { Sparkles } from "lucide-react";

type WhistleblowerRow = {
  id: string;
  subject: string;
  details: string;
  evidence_url: string | null;
  created_at: string;
};

export default function WhistleblowerPage() {
  const { user } = useAuth() as any;
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<WhistleblowerRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadHistory() {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("whistleblower_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Could not load history.");
      setLoadingHistory(false);
      return;
    }

    setHistory((data as WhistleblowerRow[]) || []);
    setLoadingHistory(false);
  }

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) {
      toast.error("Subject and details are required.");
      return;
    }

    setSubmitting(true);

    let evidenceUrl: string | null = null;

    try {
      if (file) {
        const path = `evidence/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase
          .storage
          .from("evidence")
          .upload(path, file);

        if (uploadError) {
          toast.error("File upload failed.");
          setSubmitting(false);
          return;
        }

        const { data } = supabase
          .storage
          .from("evidence")
          .getPublicUrl(path);

        evidenceUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("whistleblower_reports")
        .insert({
          subject: subject.trim(),
          details: details.trim(),
          evidence_url: evidenceUrl,
        });

      if (error) {
        toast.error("Failed to submit report.");
        setSubmitting(false);
        return;
      }

      toast.success("Report submitted.");
      setSubject("");
      setDetails("");
      setFile(null);
      await loadHistory();
    } catch {
      toast.error("Unexpected error submitting report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <SignInGate
        label="Whistleblower"
        title="Secure, confidential reporting."
        description="Sign in to submit and review whistleblower reports."
        icon={<Sparkles className="w-5 h-5" />}
      />
    );
  }

  return (
    <div className="min-h-screen pb-16 mx-auto max-w-5xl space-y-8 text-white">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Whistleblower Report
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/70">
            Submit confidential concerns about safety, misconduct, or violations.
            Your identity will be protected to the fullest extent allowed.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        {/* Form */}
        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/90">
                Subject
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Brief summary of your concern"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/90">
                Details
              </label>
              <textarea
                className="min-h-[140px] w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/40"
                placeholder="Describe what happened, who was involved, dates, locations, and any other details."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/90">
                Evidence (optional)
              </label>
              <input
                type="file"
                className="block w-full text-sm text-white/70 file:mr-4 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black hover:file:bg-yellow-300"
                onChange={(e) =>
                  setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)
                }
              />
              <p className="text-xs text-white/50">
                Upload photos, documents, or other supporting files if available.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        </GlassCard>

        {/* History */}
        <GlassCard>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Recent Reports</h2>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/70">
              {history.length} total
            </span>
          </div>

          <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {loadingHistory && (
              <p className="text-sm text-white/60">Loading history…</p>
            )}

            {!loadingHistory && history.length === 0 && (
              <p className="text-sm text-white/60">
                No reports submitted yet.
              </p>
            )}

            {!loadingHistory &&
              history.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-white/10 bg-black/30 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{r.subject}</p>
                    <span className="whitespace-nowrap text-[10px] uppercase text-white/40">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs text-white/70">
                    {r.details}
                  </p>
                  {r.evidence_url && (
                    <a
                      href={r.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-semibold text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
                    >
                      View evidence
                    </a>
                  )}
                </div>
              ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
