import { Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Clock, Award, Film } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import trainingCatalog from "@/data/trainingCatalog.json";

export default function TrainingIndex() {
  const courses = (trainingCatalog as any).courses ?? [];

  return (
    <div className="min-h-screen text-orange-100 pb-14">
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-6 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-orange-200 text-sm font-semibold">
            <GraduationCap className="w-4 h-4" />
            Training Center
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Crew Training Program
          </h1>
          <p className="text-sm md:text-base text-orange-100/80 max-w-3xl">
            Structured courses, topic-matched materials, assessments, and certificates.
          </p>
        </div>

        <Link to="/training/videos" className="block">
          <GlassCard className="p-5 bg-black/60 border border-orange-500/25 hover:border-orange-400/40 hover:bg-black/65 transition">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-orange-200/90 text-sm font-semibold">
                  <Film className="w-4 h-4" /> Video Library
                </div>
                <div className="text-white font-bold text-xl">Browse curated training videos</div>
                <div className="text-sm text-orange-100/75">
                  Use the library for refresher learning and course-aligned study.
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-orange-200/80">
                Open library
              </div>
            </div>
          </GlassCard>
        </Link>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: any) => {
            const badge = course.certificate_eligible ? "Certificate" : course.requires_test ? "Assessment" : "Training";

            const icon =
              course.category === "safety" ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <GraduationCap className="w-5 h-5" />
              );

            return (
              <Link key={course.course_id} to={`/training/course/${course.course_id}`} className="block">
                <GlassCard className="h-full p-5 flex flex-col gap-3 bg-black/60 border border-orange-500/25 hover:border-orange-400/40 hover:bg-black/65 transition">
                  <div className="w-11 h-11 rounded-2xl border border-orange-500/30 bg-black/50 flex items-center justify-center text-orange-300">
                    {icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                    <p className="text-sm text-orange-100/75">{course.description}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-orange-200/80">
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 px-2 py-1">
                      <Clock className="w-3 h-3" /> {course.estimated_minutes} min
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 px-2 py-1">
                      <Award className="w-3 h-3" /> {badge}
                    </span>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
