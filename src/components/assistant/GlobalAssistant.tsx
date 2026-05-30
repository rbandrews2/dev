import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Loader2, Send, Shield, X } from "lucide-react";
import { useAssistant } from "@/contexts/AssistantContext";
import { useAuth } from "@/contexts/AuthContext";
import AiAvatar from "./AiAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  /**
   * Optional extra context string to include in the AI prompt.
   * Useful if a parent page wants to pass a module description.
   */
  extraContext?: string;
};

function deriveModule(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/training")) return "Training";
  if (pathname.startsWith("/forms")) return "Forms";
  if (pathname.startsWith("/navigation")) return "Navigation";
  if (pathname.startsWith("/messages")) return "Messages";
  if (pathname.startsWith("/vault")) return "Vault";
  if (pathname.startsWith("/timeclock")) return "Time Clock";
  if (pathname.startsWith("/timeoff")) return "Time Off";
  if (pathname.startsWith("/video-conference")) return "Video Conference";
  if (pathname.startsWith("/security")) return "Security";
  if (pathname.startsWith("/scheduling")) return "Scheduling";
  if (pathname.startsWith("/organization")) return "Organization";
  if (pathname.startsWith("/work-orders")) return "Work Orders";
  if (pathname.startsWith("/integrations")) return "Integrations";
  return "Home";
}

export function GlobalAssistant({ extraContext }: Props) {
  const { messages, loading, sendMessage, securityEvents } = useAssistant();
  const { user, organization, isAdmin } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  const assistantContext = useMemo(
    () => ({
      route: location.pathname,
      module: deriveModule(location.pathname),
      userEmail: user?.email ?? undefined,
      organization: organization?.name ?? undefined,
      organizationId: organization?.id ?? undefined,
      role: isAdmin ? "admin" : "user",
      extraContext,
    }),
    [location.pathname, user?.email, organization?.name, isAdmin, extraContext]
  );

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    await sendMessage(text, null, { context: assistantContext });
  };

  const toggle = () => setOpen((prev) => !prev);

  const securityLabel = useMemo(() => {
    if (!securityEvents?.length) return "Secure";
    const warnings = securityEvents.filter((e) => e.type === "warning").length;
    const errors = securityEvents.filter((e) => e.type === "error").length;
    if (errors) return `${errors} alert${errors > 1 ? "s" : ""}`;
    if (warnings) return `${warnings} warning${warnings > 1 ? "s" : ""}`;
    return "Secure";
  }, [securityEvents]);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-40 rounded-full bg-orange-500 p-1 shadow-lg hover:scale-105 transition-transform border border-orange-600/60 focus:outline-none focus:ring-2 focus:ring-orange-300"
        aria-label="Open Atlas assistant"
        title="Open Atlas assistant"
      >
        <span className="relative inline-flex">
          <AiAvatar size={56} />
          <span className="absolute inset-0 rounded-full animate-ping bg-orange-500/35" aria-hidden />
          {hasMessages && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border border-black" aria-hidden />
          )}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-full max-w-sm md:max-w-md shadow-2xl">
          <div className="bg-neutral-950/95 border border-orange-500/30 rounded-xl overflow-hidden backdrop-blur-md">
            <header className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20 bg-black/60">
              <div className="flex items-center gap-3">
                <AiAvatar size={38} />
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-orange-200">Atlas AI</span>
                  <span className="text-xs text-orange-100/70">
                    {assistantContext.module} - {assistantContext.route}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-500/30 text-[11px] text-orange-100 bg-black/50">
                  <Shield className="w-3 h-3" />
                  {securityLabel}
                </div>
                <button
                  type="button"
                  onClick={toggle}
                  className="text-orange-200 hover:text-white"
                  aria-label="Close assistant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className="px-4 py-3 text-xs text-orange-100/80 border-b border-orange-500/10 bg-orange-500/5">
              Context-aware guidance for this screen. I watch your route and form inputs to tailor answers. Enter to send, Shift+Enter for a new line.
            </div>

            <div
              ref={scrollRef}
              className="max-h-[360px] overflow-y-auto px-4 py-3 space-y-3 bg-black/40"
            >
              {messages.length === 0 && (
                <div className="flex items-start gap-3 text-sm text-orange-100/80">
                  <AiAvatar size={28} />
                  <p>
                    Hi! I&apos;m Atlas AI. I can help with app features, safety guidance, forms, time clock, work orders, navigation, scheduling, messaging, and training. I&apos;ll keep answers brief and actionable.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && <AiAvatar size={26} />}
                  <div
                    className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-orange-500 text-black ml-auto"
                        : "bg-black/70 border border-orange-500/20 text-orange-50"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-orange-400 text-black flex items-center justify-center text-xs font-bold">
                      {user?.email?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-orange-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>

            {securityEvents?.length > 0 && (
              <div className="px-4 py-2 bg-black/70 border-t border-orange-500/20 text-[11px] text-orange-100 space-y-1">
                <div className="flex items-center gap-2 text-orange-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Security signals detected (local preview)
                </div>
                <ul className="space-y-1">
                  {securityEvents.slice(0, 3).map((event, idx) => (
                    <li key={`${event.timestamp}-${idx}`} className="flex items-start gap-2">
                      <span className="mt-0.5 block h-1.5 w-1.5 rounded-full bg-orange-400" />
                      <span className="text-orange-100/80">
                        {event.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 bg-black/70 border-t border-orange-500/20">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about this page..."
                className="min-h-[72px] bg-black/80 border-orange-500/30 text-orange-50 placeholder:text-orange-200/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-orange-100/70">
                  Atlas pulls route, module, and form hints to guide you.
                </div>
                <Button
                  size="sm"
                  disabled={loading || !draft.trim()}
                  onClick={() => void handleSend()}
                  className="bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalAssistant;
