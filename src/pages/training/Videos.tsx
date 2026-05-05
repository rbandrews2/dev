import { Link } from "react-router-dom";
import { ArrowLeft, Film, PlayCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import VideoLibrary from "@/components/training/VideoLibrary";

export default function TrainingVideosPage() {
  return (
    <div className="min-h-screen text-yellow-100 pb-14">
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-200 text-sm font-semibold">
              <Film className="w-4 h-4" />
              Training Videos
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Video Library
            </h1>
            <p className="text-sm md:text-base text-amber-100/80 max-w-3xl">
              Curated work zone, safety, and professional development videos for crews and leaders.
            </p>
          </div>

          <Link
            to="/training"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-black/50 px-4 py-2 text-amber-200 hover:bg-black/60 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training Center
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <GlassCard className="p-5 bg-black/60 border border-amber-500/25">
            <div className="flex items-center gap-2 text-amber-200/90 text-sm font-semibold mb-3">
              <PlayCircle className="w-4 h-4" />
              Browse and play
            </div>
            <VideoLibrary />
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
