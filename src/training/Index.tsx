import { Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Clock, Award, Film } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import trainingCatalog from "@/data/trainingCatalog.json";

export default function TrainingIndex() {
  const courses = trainingCatalog.courses ?? [];

  return (
    <div className="min-h-screen text-orange-100 pb-14">
      <section className="relative overflow-hidden rounded-3xl border border-orange-500/25 shadow-glow p-6 md:p-10 bg-black max-w-6xl mx-auto mt-4">
        <div className="absolute inset-0 -z-10">
          <img
            src="/hero-construction.png"
            alt="Training"
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
        </div>

        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-orange-200 text-sm font-semibold">
            <GraduationCap className="w-4 h-4" />
            Training Center
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Built for Road Crews. Designed for Compliance.
          </h1>

          <p className="text-sm md:text-base text-orange-100/80">
            Study, practice, and test into verified completion. No dead links, no placeholders-only working training paths with certificates where applicable.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Video Library Card */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/training/videos" className="block">
            <GlassCard className="h-full p-5 flex flex-col gap-3 bg-black/60 border border-orange-500/25 hover:border-orange-400/40 hover:bg-black/65 transition">
              <div className="w-11 h-11 rounded-2xl border border-orange-500/30 bg-black/50 flex items-center justify-center text-orange-300">
                <Film className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">Video Library</h3>
                <p className="text-sm text-orange-100/75">
                  Curated safety, field operations, and leadership videos with search and filters.
                </p>
              </div>

              <div className="mt-auto text-[11px] uppercase tracking-[0.14em] text-orange-200/80 flex items-center gap-2">
                Browse videos
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* Courses */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c: any) => (
            <Link key={c.course_id} to={`/training/course/${c.course_id}`} className="block">
              <GlassCard className="h-full p-5 flex flex-col gap-4 bg-black/60 border border-orange-500/25 hover:border-orange-400/40 hover:bg-black/65 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-orange-200/80">{c.category}</p>
                    <h3 className="text-lg font-semibold text-white">{c.title}</h3>
                  </div>

                  <div className="shrink-0 w-11 h-11 rounded-2xl border border-orange-500/30 bg-black/50 flex items-center justify-center text-orange-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-sm text-orange-100/75 line-clamp-3">
                  {c.description}
                </p>

                <div className="mt-auto flex items-center justify-between text-xs text-orange-200/80">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {c.estimated_minutes} min
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {c.certificate_eligible || c.course_id === "cdl_prep" ? "Certificate" : "Study"}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
