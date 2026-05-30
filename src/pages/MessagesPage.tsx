import { MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { EchoChatWidget } from "@/components/echochat";

export default function MessagesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-1 text-orange-50 sm:gap-5 sm:px-0">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/70">
          Messaging
        </p>
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/15 text-orange-200 sm:h-11 sm:w-11">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
              EchoChat
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-orange-100/75">
              Real-time crew conversations for field updates, coordination, and follow-up.
            </p>
          </div>
        </div>
      </header>

      <GlassCard className="overflow-hidden p-2 sm:p-3">
        <EchoChatWidget className="border-0 bg-black/55 shadow-none" />
      </GlassCard>
    </div>
  );
}
