import { Bell, CheckCircle2, ChevronRight, DownloadCloud, MapPin, Mic, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

type PermissionChecklist = {
  location: boolean;
  media: boolean;
  notifications: boolean;
  license: boolean;
};

type PermissionStateLabel = "granted" | "prompt" | "denied" | "default" | "unsupported" | "checking";

type InstallExperienceProps = {
  visible: boolean;
  installable: boolean;
  installed: boolean;
  updateAvailable: boolean;
  installing: boolean;
  permissionNote: string | null;
  checklist: PermissionChecklist;
  onChecklistChange: (key: keyof PermissionChecklist, value: boolean) => void;
  permissionStates: Record<Exclude<keyof PermissionChecklist, "license">, PermissionStateLabel>;
  onPermissionRequest: (key: Exclude<keyof PermissionChecklist, "license">) => void;
  onInstall: () => void;
  onUpdate: () => void;
  onLater: () => void;
};

const permissionCards = [
  {
    key: "location" as const,
    icon: MapPin,
    title: "Enable precise location?",
    description: "Used for turn-by-turn navigation, live crew routing, and faster jobsite check-ins.",
  },
  {
    key: "media" as const,
    icon: Mic,
    title: "Enable camera and microphone?",
    description: "Used for crew briefings, video calls, and field support when you join a conference.",
  },
  {
    key: "notifications" as const,
    icon: Bell,
    title: "Enable crew notifications?",
    description: "Used for schedule changes, time clock reminders, safety alerts, and app update notices.",
  },
  {
    key: "license" as const,
    icon: ShieldCheck,
    title: "Allow secure company use?",
    description: "Your organization can sync work data and forms. Use must follow company safety policy.",
  },
];

export default function InstallExperience({
  visible,
  installable,
  installed,
  updateAvailable,
  installing,
  permissionNote,
  checklist,
  onChecklistChange,
  permissionStates,
  onPermissionRequest,
  onInstall,
  onUpdate,
  onLater,
}: InstallExperienceProps) {
  if (!visible) return null;

  const allChecked = Object.values(checklist).every(Boolean);
  const installButtonLabel = installing
    ? "Requesting permissions..."
    : updateAvailable
      ? "Install available update"
      : installed
        ? "App is installed"
        : installable
          ? "Continue and install app"
          : "Continue setup";

  const renderState = (key: keyof PermissionChecklist) => {
    if (key === "license") return checklist.license ? "Accepted" : "Required";
    const state = permissionStates[key];
    if (state === "granted") return "Granted";
    if (state === "denied") return "Blocked";
    if (state === "unsupported") return "Browser setting";
    if (state === "checking") return "Checking";
    return "Ask browser";
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <div className="absolute inset-0 overflow-hidden bg-black">
        <img
          src="/wzos-install-bg.png"
          alt="Work Zone OS installation background"
          className="h-full w-full object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.26),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.72)_42%,rgba(0,0,0,0.94)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-orange-500/10" />
      </div>

      <div className="relative flex min-h-screen items-start justify-center px-3 py-4 sm:items-center sm:p-6">
        <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-orange-400/30 bg-black/70 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
            <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-100/80">
                  <Smartphone className="h-3.5 w-3.5" />
                  One-screen install
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-orange-200/70">Work Zone OS</p>
                  <h1 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                    Set up the app for field use.
                  </h1>
                </div>
                <p className="max-w-sm text-sm leading-6 text-orange-50/78">
                  Review the permissions below, tick each item, then continue. We&apos;ll request the real
                  browser permissions immediately after.
                </p>
              </div>
              <img src="/wzos-logo.svg" alt="WZOS logo" className="mt-1 h-10 w-10 shrink-0 opacity-90 sm:h-12 sm:w-12" />
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {permissionCards.map(({ key, icon: Icon, title, description }) => (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-3 transition hover:border-orange-300/35 hover:bg-white/10 sm:gap-4 sm:px-4 sm:py-4"
                >
                  <Checkbox
                    checked={checklist[key]}
                    onCheckedChange={(checked) => {
                      if (key === "license") {
                        onChecklistChange(key, checked === true);
                      } else if (checked === true) {
                        onPermissionRequest(key);
                      }
                    }}
                    disabled={key !== "license" && permissionStates[key] === "granted"}
                    className="mt-1 h-5 w-5 rounded-md border-orange-300/60 data-[state=checked]:bg-orange-400 data-[state=checked]:text-black"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10 text-orange-200 sm:h-9 sm:w-9 sm:rounded-2xl">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                      </div>
                      <span className="rounded-full border border-orange-300/25 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-orange-100/80">
                        {renderState(key)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-orange-50/72">{description}</p>
                    {key !== "license" && permissionStates[key] !== "granted" && (
                      <button
                        type="button"
                        onClick={() => onPermissionRequest(key)}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-orange-300/30 bg-black/25 px-3 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-400/10"
                      >
                        Request permission
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-emerald-400/18 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/88">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-white">Why this matters</p>
                  <p className="mt-1 leading-6 text-emerald-50/80">
                    These permissions unlock navigation, real-time crew support, and a native-style home screen
                    shortcut for faster launch in the field.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {updateAvailable && (
                <button
                  type="button"
                  onClick={onUpdate}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-emerald-300/40 bg-emerald-500 px-4 py-4 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                  <RefreshCw className="h-4 w-4" />
                  Update Work Zone OS now
                </button>
              )}
              <button
                type="button"
                onClick={onInstall}
                disabled={!allChecked || installing || installed}
                className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-orange-400 px-4 py-4 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {installed ? <CheckCircle2 className="h-4 w-4" /> : <DownloadCloud className="h-4 w-4" />}
                <span>{installButtonLabel}</span>
                {!installing && !installed && <ChevronRight className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onLater}
                className="w-full rounded-[1.2rem] border border-white/12 bg-black/25 px-4 py-3 text-sm font-medium text-orange-50/88 transition hover:bg-white/8"
              >
                Maybe later
              </button>
            </div>

            <div className="mt-4 space-y-2 text-center">
              {permissionNote ? (
                <p className="text-xs text-orange-100/76">{permissionNote}</p>
              ) : (
                <p className="text-xs text-orange-100/60">
                  {installable
                    ? "The browser install prompt appears after permissions are approved."
                    : "If your browser does not show an install prompt, use its menu to add Work Zone OS to your home screen."}
                </p>
              )}
              <p className="text-[11px] text-orange-100/52">
                By continuing, you agree to the{" "}
                <Link to="/license-agreement" className="text-orange-200 underline underline-offset-2">
                  license terms
                </Link>{" "}
                and your organization&apos;s safety policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
