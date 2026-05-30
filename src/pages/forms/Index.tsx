import FeatureTile from "@/components/FeatureTile";
import { GlassCard } from "@/components/GlassCard";
import SignInGate from "@/components/auth/SignInGate";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardList,
  ShieldAlert,
  FileText,
  FileWarning,
  Building2,
  Sparkles,
  Clock3,
} from "lucide-react";

export default function FormsIndex() {
  const { user } = useAuth() as any;
  const forms = [
    {
      title: "C85",
      description: "Daily work log with crew hours, locations, and tasks.",
      icon: <ClipboardList className="w-5 h-5" />,
      to: "/forms/c85",
    },
    {
      title: "JSA",
      description: "Job Safety Analysis covering hazards and mitigations.",
      icon: <ShieldAlert className="w-5 h-5" />,
      to: "/forms/jsa",
    },
    {
      title: "DVIR",
      description: "Vehicle inspection with issues, repairs, and clearance.",
      icon: <FileText className="w-5 h-5" />,
      to: "/forms/dvir",
    },
    {
      title: "Incident",
      description: "Capture incident context, photos, and follow-up actions.",
      icon: <FileWarning className="w-5 h-5" />,
      to: "/forms/incident",
    },
    {
      title: "Whistleblower",
      description: "Secure, confidential reporting with audit trail.",
      icon: <Sparkles className="w-5 h-5" />,
      to: "/forms/whistleblower",
    },
    {
      title: "Time Off Request",
      description: "Submit and track time off as a standard form workflow.",
      icon: <Clock3 className="w-5 h-5" />,
      to: "/timeoff",
    },
    {
      title: "Company Forms",
      description: "Download company PDFs and shared documents.",
      icon: <Building2 className="w-5 h-5" />,
      to: "/forms/company",
    },
  ];

  if (!user) {
    return (
      <SignInGate
        label="Forms Hub"
        title="All safety and ops forms in one place."
        description="Sign in to open C85, JSA, DVIR, Incident, Whistleblower, and Company Forms."
        icon={<ClipboardList className="w-5 h-5" />}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl w-full mx-auto text-orange-100 px-1 sm:px-2">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border border-orange-400/40 bg-black/60 flex items-center justify-center text-orange-300 shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
              Forms Hub
            </h1>
          </div>
        </div>
        <div className="h-[2px] w-48 bg-gradient-to-r from-orange-400 via-orange-400 to-transparent rounded-full shadow-[0_0_16px_rgba(249,115,22,0.6)]" />
      </header>

      <GlassCard className="p-4 text-sm text-orange-100/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-orange-300 animate-pulse" />
            Open any available form from this hub.
          </span>
          <span className="text-orange-200/70">
            C85, JSA, DVIR, Incident, Whistleblower, Company forms
          </span>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
        {forms.map((form) => (
          <FeatureTile key={form.title} {...form} />
        ))}
      </div>
    </div>
  );
}
