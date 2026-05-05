import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Award, Clock, GraduationCap, PlayCircle, BookOpen, CheckCircle2 } from "lucide-react";
import trainingCatalog from "@/data/trainingCatalog.json";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { getCourseMaterial, getVideosForTopics } from "@/data/courseMaterials";
import { trainingVideos } from "@/data/trainingVideos";
import { markItemCompleted, hasCompletedModuleItem } from "@/lib/training/trainingProgress";
import { cdlQuestions } from "@/lib/training/cdlQuestions";
import { useCDLPrep } from "@/lib/training/useCDLPrep";
import { flaggerQuestions } from "@/lib/training/flaggerQuestions";
import { useQuiz } from "@/lib/training/useQuiz";
import { downloadCertificatePDF } from "@/lib/training/certificates";

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function CourseDetailContent({ courseId }: { courseId: string }) {
  const { user, loading } = useAuth();

  const course = useMemo(
    () => (trainingCatalog as any).courses?.find((c: any) => c.course_id === courseId),
    [courseId]
  );

  const material = useMemo(() => getCourseMaterial(courseId), [courseId]);
  const matchedVideos = useMemo(() => getVideosForTopics(material.videoTopics) ?? [], [material.videoTopics]);
  const requiredVideos = useMemo(() => {
    const requiredMap: Record<string, string[]> = {
      flagger: ["flagger-basics-1", "flagger-training-cdot"],
      ttc: ["two-lane-work-zone", "wz-traffic-control-inspection"],
      night_work: ["night-work-lighting-strategies", "night-work-traffic-control"],
      work_zone_fundamentals: [
        "wz-fundamentals-overview",
        "wz-fundamentals-traffic-control",
      ],
      ppe: ["ppe-overview-basics", "ppe-inspection-fit"],
      dvir: ["dvir-pretrip-inspection"],
      harassment: ["harassment-prevention-overview", "harassment-how-to-respond"],
      cdl_prep: ["cdl-prep-overview"],
      pmt: ["pmt-project-management-overview"],
    };

    const requiredIds = requiredMap[courseId] || [];
    const map = (vid: any) => vid && { ...vid, required: true };
    const byId = (id: string) =>
      matchedVideos.find((v: any) => v.id === id) ||
      (trainingVideos as any[]).find((v) => v.id === id);

    const req = requiredIds.map((rid) => map(byId(rid))).filter(Boolean) as any[];

    // If still short, fill from matchedVideos then global library
    const fill: any[] = [];
    matchedVideos.forEach((v: any) => {
      if (!req.find((r: any) => r?.id === v.id)) fill.push(v);
    });
    (trainingVideos as any[]).forEach((v) => {
      if (!req.find((r: any) => r?.id === v.id) && !fill.find((f: any) => f.id === v.id)) {
        fill.push(v);
      }
    });

    const combined = [...req, ...fill];
    const trimmed = combined.slice(0, Math.max(2, req.length || 2));
    if (trimmed.length === 0 && trainingVideos.length > 0) {
      return trainingVideos.slice(0, 2) as any[];
    }
    return trimmed;
  }, [courseId, matchedVideos]);
  const passThreshold = (trainingCatalog as any).pass_threshold ?? 80;

  const [studyDone, setStudyDone] = useState(false);
  const [videosDone, setVideosDone] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const cdl = useCDLPrep();
  const flagger = useQuiz(flaggerQuestions as any, passThreshold);

  const requiresQuiz = Boolean((course as any)?.requires_test || material.requiresTest);
  const isCDL = courseId === "cdl_prep";
  const isFlagger = courseId === "flagger";

  const quizPassed = useMemo(() => {
    if (!requiresQuiz) return true;
    if (isCDL) return cdl.passed;
    if (isFlagger) return flagger.passed;
    return false;
  }, [requiresQuiz, isCDL, isFlagger, cdl.passed, flagger.passed]);

  const percentScore = useMemo(() => {
    if (!requiresQuiz) return undefined;
    if (isCDL) return cdl.percent;
    if (isFlagger) return flagger.percent;
    return undefined;
  }, [requiresQuiz, isCDL, isFlagger, cdl.percent, flagger.percent]);

  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      setLoadingProgress(true);
      const uid = user?.id;
      const s = await hasCompletedModuleItem(uid, courseId, "study_complete");
      const v = await hasCompletedModuleItem(uid, courseId, "videos_complete");
      const q = await hasCompletedModuleItem(uid, courseId, "quiz_passed");
      if (!mounted) return;
      setStudyDone(Boolean(s));
      setVideosDone(Boolean(v));
      setQuizDone(Boolean(q));
      setLoadingProgress(false);
    }

    if (courseId) loadProgress();
    return () => {
      mounted = false;
    };
  }, [courseId, user?.id]);

  async function completeStudy() {
    setStudyDone(true);
    await markItemCompleted(user?.id, courseId, "study_complete");
  }

  async function completeVideos() {
    setVideosDone(true);
    await markItemCompleted(user?.id, courseId, "videos_complete");
  }

  async function completeQuizIfPassed() {
    if (!quizPassed) return;
    setQuizDone(true);
    await markItemCompleted(user?.id, courseId, "quiz_passed");
  }

  const certificateEligible = Boolean((course as any)?.certificate_eligible || material.certificateEligible);
  const fullyComplete = studyDone && videosDone && (!requiresQuiz || quizDone);

  async function downloadCertificate() {
    if (!fullyComplete || !certificateEligible) return;

    const certId = `${courseId}-${user?.id?.slice(0, 8) || "anon"}-${Date.now().toString(36)}`;

    await downloadCertificatePDF({
      userName: (user as any)?.user_metadata?.full_name || (user as any)?.email || "Crew Member",
      courseName: material.title,
      certificateId: certId,
      completionDate: isoDate(),
      score: percentScore,
      organizationName: "Work Zone OS"
    });

    await markItemCompleted(user?.id, courseId, `certificate_downloaded_${certId}`);
  }

  if (!loading && !user) return <Navigate to="/" replace />;

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-yellow-100">
        <GlassCard className="p-6 bg-black/60">
          <h1 className="text-2xl font-bold text-white">Course not found</h1>
          <p className="text-amber-100/80 mt-2">This training course is not available in the catalog.</p>
          <Link to="/training" className="inline-flex mt-4 text-amber-300 hover:underline">
            Back to Training Center
          </Link>
        </GlassCard>
      </div>
    );
  }

  const badge = (course as any).certificate_eligible ? "Certificate" : requiresQuiz ? "Assessment" : "Training";

  return (
    <div className="min-h-screen text-yellow-100 pb-14">
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-6 space-y-6">
        <Link
          to="/training"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-black/50 px-4 py-2 text-amber-200 hover:bg-black/60 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Training Center
        </Link>

        <div className="space-y-6">
            <GlassCard className="p-6 bg-black/60 border border-amber-500/25">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-200 text-sm font-semibold">
                    <GraduationCap className="w-4 h-4" />
                    {(course as any).title}
                  </div>
                  <p className="text-amber-100/80 max-w-3xl">{(course as any).description}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-amber-200/80">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 px-2 py-1">
                      <Clock className="w-3 h-3" /> {(course as any).estimated_minutes} min
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 px-2 py-1">
                      <Award className="w-3 h-3" /> {badge}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[220px]">
                  <button
                    onClick={completeStudy}
                    disabled={loadingProgress || studyDone}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold border transition ${
                      studyDone
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                        : "bg-black/50 border-amber-500/30 text-amber-200 hover:bg-black/60"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {studyDone ? "Study Complete" : "Mark Study Complete"}
                    </span>
                  </button>

                  <button
                    onClick={completeVideos}
                    disabled={loadingProgress || videosDone}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold border transition ${
                      videosDone
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                        : "bg-black/50 border-amber-500/30 text-amber-200 hover:bg-black/60"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      {videosDone ? "Videos Complete" : "Mark Videos Complete"}
                    </span>
                  </button>

                  {requiresQuiz && (
                    <button
                      onClick={completeQuizIfPassed}
                      disabled={loadingProgress || quizDone || !quizPassed}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold border transition ${
                        quizDone
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                          : quizPassed
                          ? "bg-black/50 border-amber-500/30 text-amber-200 hover:bg-black/60"
                          : "bg-black/30 border-white/10 text-white/40 cursor-not-allowed"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {quizDone ? "Assessment Passed" : quizPassed ? "Confirm Pass" : `Pass Required (${passThreshold}%)`}
                      </span>
                    </button>
                  )}

                  {certificateEligible && (
                    <button
                      onClick={() => void downloadCertificate()}
                      disabled={!fullyComplete}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold border transition ${
                        fullyComplete
                          ? "bg-amber-400 text-black border-amber-300 hover:bg-amber-300"
                          : "bg-black/30 border-white/10 text-white/40 cursor-not-allowed"
                      }`}
                    >
                      Download Certificate (PDF)
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 bg-black/60 border border-amber-500/25">
              <h2 className="text-xl font-bold text-white mb-4">Study Material</h2>
              <div className="space-y-4">
                {material.study.map((s, idx) => (
                  <div key={idx} className="rounded-xl border border-amber-500/20 bg-black/40 p-4">
                    <div className="text-white font-semibold mb-1">{s.title}</div>
                    <div className="text-sm text-amber-100/80 leading-relaxed whitespace-pre-line">
                      {s.body}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6 bg-black/60 border border-amber-500/25 space-y-4">
              <h2 className="text-xl font-bold text-white">Required Videos</h2>
              {requiredVideos && requiredVideos.length ? (
                <>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-amber-500/40">
                    <iframe
                      key={requiredVideos[0].youtubeId}
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${requiredVideos[0].youtubeId}`}
                      title={requiredVideos[0].title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-white font-semibold">{requiredVideos[0].title}</div>
                      <div className="text-sm text-amber-100/75 mt-1">
                        {requiredVideos[0].description || ""}
                      </div>
                      <div className="text-[11px] text-amber-200/70 mt-1 uppercase tracking-[0.14em]">
                        Required for completion
                      </div>
                    </div>
                    {requiredVideos.slice(1).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-amber-100/80 font-semibold">Up next</div>
                        {requiredVideos.slice(1).map((v: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-amber-500/20 bg-black/40 p-3 flex justify-between items-start gap-3"
                          >
                            <div>
                              <div className="text-white font-semibold">{v.title}</div>
                              <div className="text-sm text-amber-100/75 mt-1 line-clamp-2">
                                {v.description || ""}
                              </div>
                            </div>
                            <a
                              className="text-amber-300 hover:underline text-xs"
                              href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {matchedVideos.length > 2 && (
                      <div className="space-y-2">
                        <div className="text-sm text-amber-100/80 font-semibold">More recommended</div>
                        <ul className="space-y-2">
                          {matchedVideos
                            .filter((v: any) => !requiredVideos.find((r: any) => r.id === v.id))
                            .slice(0, 5)
                            .map((v: any, idx: number) => (
                              <li key={idx} className="text-sm text-amber-100/75 flex justify-between items-start gap-3">
                                <div className="space-y-1">
                                  <div className="text-white font-semibold">{v.title}</div>
                                  <div className="text-xs text-amber-100/70 line-clamp-2">
                                    {v.description || ""}
                                  </div>
                                </div>
                                {v.url && (
                                  <a
                                    className="text-amber-300 hover:underline text-xs whitespace-nowrap"
                                    href={v.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open
                                  </a>
                                )}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-100/75">No videos matched this course’s topics yet.</p>
              )}
              <Link to="/training/videos" className="inline-flex mt-2 text-amber-300 hover:underline text-sm">
                Browse full Video Library
              </Link>
            </GlassCard>

            {requiresQuiz && (
              <GlassCard className="p-6 bg-black/60 border border-amber-500/25">
                <h2 className="text-xl font-bold text-white mb-2">Assessment</h2>
                <p className="text-sm text-amber-100/75 mb-5">
                  Pass with {passThreshold}% or higher to complete this course.
                </p>

                {isCDL ? (
                  <div className="space-y-4">
                    {cdlQuestions.map((q: any) => (
                      <div key={q.id} className="rounded-xl border border-amber-500/20 bg-black/40 p-4 space-y-3">
                        <div className="font-semibold text-white">{q.question}</div>
                        <div className="grid gap-2">
                          {Array.isArray(q.choices) &&
                            q.choices.map((choice: string, idx: number) => {
                              const selected = (cdl as any).answers[q.id] === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => (cdl as any).answerQuestion(q.id, idx)}
                                  className={`text-left rounded-lg px-3 py-2 border transition ${
                                    selected
                                      ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                                      : "border-white/10 bg-black/40 text-amber-100/80 hover:bg-black/50"
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border border-amber-500/20 bg-black/40 p-4 flex items-center justify-between flex-wrap gap-3">
                      <div className="text-sm text-amber-100/80">
                        Score: <span className="font-semibold text-white">{(cdl as any).percent}%</span>
                      </div>
                      <div className={`text-sm font-semibold ${(cdl as any).passed ? "text-emerald-300" : "text-amber-200"}`}>
                        {(cdl as any).passed ? "Passed" : "Not yet passed"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flaggerQuestions.map((q: any) => (
                      <div key={q.id} className="rounded-xl border border-amber-500/20 bg-black/40 p-4 space-y-3">
                        <div className="font-semibold text-white">{q.question}</div>
                        <div className="grid gap-2">
                          {Array.isArray(q.choices) &&
                            q.choices.map((choice: string, idx: number) => {
                              const selected = (flagger as any).answers[q.id] === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => (flagger as any).answerQuestion(q.id, idx)}
                                  className={`text-left rounded-lg px-3 py-2 border transition ${
                                    selected
                                      ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                                      : "border-white/10 bg-black/40 text-amber-100/80 hover:bg-black/50"
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border border-amber-500/20 bg-black/40 p-4 flex items-center justify-between flex-wrap gap-3">
                      <div className="text-sm text-amber-100/80">
                        Score: <span className="font-semibold text-white">{(flagger as any).percent}%</span>
                      </div>
                      <div className={`text-sm font-semibold ${(flagger as any).passed ? "text-emerald-300" : "text-amber-200"}`}>
                        {(flagger as any).passed ? "Passed" : "Not yet passed"}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            )}
          </div>

    
      </section>
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  return <CourseDetailContent courseId={id || ""} />;
}
