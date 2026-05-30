import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Award, ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, Film, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import trainingCatalog from "@/data/trainingCatalog.json";
import { trainingVideos } from "@/data/trainingVideos";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";

type Course = {
  course_id: string;
  title: string;
  category: string;
  required_roles: string[];
  certificate_eligible: boolean;
  estimated_minutes: number;
  description: string;
};

type ResourceLink = { title: string; href: string; label?: string };

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

type CourseMaterials = {
  topics: string[];
  study: Array<{ title: string; body: string }>;
  resources: ResourceLink[];
  requiresTest: boolean;
  quiz: QuizQuestion[];
  certificate: { eligible: boolean; kind: "standard" | "pocket"; label: string };
};

const PASS_THRESHOLD = (trainingCatalog as any)?.pass_threshold ?? 0.8;

const COURSE_MATERIALS: Record<string, CourseMaterials> = {
  // Compliance / Safety
  flagger: {
    topics: ["flagging", "signal paddles", "lane control", "work zone safety", "traffic control", "visibility"],
    study: [
      {
        title: "Core Responsibilities",
        body:
          "A flagger protects the public and the crew by maintaining orderly traffic through the work zone.\n\nKey points:\n- Maintain proper position and escape route at all times.\n- Stay visible: ANSI/ISEA high-visibility apparel, hardhat, and required PPE.\n- Use the STOP/SLOW paddle correctly and confidently.\n- Maintain situational awareness (vehicles, crew movement, equipment swings).",
      },
      {
        title: "Positioning and Sight Distance",
        body:
          "Your position must provide adequate sight distance for approaching drivers and keep you out of the path of traffic.\n\nChecklist:\n- Stand on the shoulder/edge with clear visibility.\n- Avoid standing in the open lane.\n- Keep an escape route.\n- Verify your sign spacing and advance warning devices match the plan.",
      },
      {
        title: "Emergency and Non-Compliance",
        body:
          "If a vehicle fails to stop:\n- Do not attempt to physically stop the vehicle.\n- Move to safety immediately.\n- Warn crew via radio/voice.\n- Notify supervisor; document if required.\n\nIn any near-miss, prioritize safety first, then documentation.",
      },
    ],
    resources: [
      { title: "Temporary Traffic Control Basics (Reference)", href: "https://mutcd.fhwa.dot.gov/" , label: "MUTCD" },
      { title: "Work Zone Safety Resources", href: "https://www.workzonesafety.org/" },
    ],
    requiresTest: true,
    quiz: [
      { id: "f1", question: "What is the primary purpose of a flagger?", options: ["Direct traffic safely through the work zone", "Inspect pavement quality", "Operate heavy equipment", "Control project scheduling"], correctIndex: 0 },
      { id: "f2", question: "When using a STOP/SLOW paddle, the STOP face should be displayed:", options: ["Only at night", "Whenever traffic must stop", "Only when the supervisor is present", "Only in low-speed zones"], correctIndex: 1 },
      { id: "f3", question: "A flagger should always maintain:", options: ["A clear escape route", "A position in the open lane", "A distance within 3 feet of cones", "A location behind the truck at all times"], correctIndex: 0 },
      { id: "f4", question: "If a driver does not stop, the safest action is to:", options: ["Step into the lane to force them to stop", "Throw a cone toward the vehicle", "Move to safety and warn the crew", "Run after the vehicle to get a plate number"], correctIndex: 2 },
      { id: "f5", question: "Which behavior best supports flagger safety and credibility?", options: ["Clear, decisive signals and attentive posture", "Sitting down between vehicle groups", "Texting while holding the paddle", "Standing where drivers cannot see you"], correctIndex: 0 },
      { id: "f6", question: "High-visibility apparel is required because it:", options: ["Is optional in daylight", "Makes the flagger more visible to drivers", "Is only for supervisors", "Replaces all other PPE"], correctIndex: 1 },
      { id: "f7", question: "Advance warning devices and spacing must match:", options: ["Whatever is fastest to place", "The approved traffic control plan and standards", "Only the crew leader’s preference", "Only the driver’s view"], correctIndex: 1 },
      { id: "f8", question: "A flagger should stand:", options: ["In the open travel lane", "On the shoulder/edge with a clear view and safety buffer", "Directly in front of equipment", "Behind a closed lane taper"], correctIndex: 1 },
      { id: "f9", question: "Situational awareness includes watching for:", options: ["Only traffic speed", "Only crew movement", "Traffic, equipment, and crew movement", "Only weather"], correctIndex: 2 },
      { id: "f10", question: "If an incident occurs, the first priority is:", options: ["Documentation", "Safety and medical response", "Taking photos for marketing", "Finishing the shift"], correctIndex: 1 },
    ],
    certificate: { eligible: true, kind: "pocket", label: "Flagger Pocket Certificate" },
  },

  cdl_prep: {
    topics: ["cdl", "pre-trip", "vehicle inspection", "air brakes", "combination vehicles", "safety"],
    study: [
      {
        title: "Pre-Trip Inspection Fundamentals",
        body:
          "A proper pre-trip inspection confirms the vehicle is safe and legally compliant.\n\nFocus areas:\n- Steering components and suspension\n- Brakes (including air system checks when applicable)\n- Lights, reflectors, and conspicuity\n- Tires, wheels, and lug nuts\n- Fluids/leaks, belts, and hoses\n- Coupling systems (if combination vehicle)\n\nAlways document defects and do not operate unsafe equipment.",
      },
      {
        title: "Air Brakes Essentials",
        body:
          "If operating air brakes:\n- Know how pressure builds and the low-air warning threshold.\n- Perform the applied pressure test for leaks.\n- Verify spring brake pop-out.\n\nDrivers must understand system behavior before operating in traffic or in work zones.",
      },
      {
        title: "Work Zone Driving Discipline",
        body:
          "Work zones demand controlled driving:\n- Obey reduced speeds.\n- Increase following distance.\n- Avoid sudden lane changes.\n- Watch for workers/equipment swing paths.\n- Follow flagger directions immediately.\n\nProfessional driving is calm, consistent, and predictable.",
      },
    ],
    resources: [
      { title: "FMCSA Driver Handbook (Reference)", href: "https://www.fmcsa.dot.gov/regulations" , label: "FMCSA" },
      { title: "CDL Pre-Trip Inspection Overview", href: "https://www.fmcsa.dot.gov/" },
    ],
    requiresTest: true,
    quiz: [
      { id: "c1", question: "A pre-trip inspection is primarily performed to:", options: ["Increase fuel economy", "Confirm vehicle safety and legal compliance", "Reduce paperwork", "Replace scheduled maintenance"], correctIndex: 1 },
      { id: "c2", question: "During a pre-trip, you should check tires for:", options: ["Correct inflation and visible damage", "Only brand name", "Only tread color", "Only if it is raining"], correctIndex: 0 },
      { id: "c3", question: "If you detect an active fluid leak, you should:", options: ["Ignore it if the vehicle starts", "Report/document the defect and address before operating", "Drive slowly to 'burn it off'", "Cover it with dirt"], correctIndex: 1 },
      { id: "c4", question: "In an air brake applied pressure test, you are checking:", options: ["Horn volume", "Brake system leaks under pressure", "Headlight brightness", "Engine idle speed"], correctIndex: 1 },
      { id: "c5", question: "In a work zone, a professional driver should:", options: ["Maintain normal speed to keep traffic flowing", "Increase following distance and drive predictably", "Follow closely to prevent cut-ins", "Change lanes aggressively"], correctIndex: 1 },
      { id: "c6", question: "If the low-air warning activates while driving, you should:", options: ["Continue to destination", "Safely pull over and address immediately", "Turn off the warning light", "Accelerate to build pressure faster"], correctIndex: 1 },
      { id: "c7", question: "Wheel and rim checks should include:", options: ["Lug nuts, cracks, and secure mounting", "Only the hub cap", "Only the paint condition", "Only the tire brand"], correctIndex: 0 },
      { id: "c8", question: "Coupling system inspection (combination vehicle) is important to prevent:", options: ["Radio interference", "Trailer separation", "Wind noise", "Fuel evaporation"], correctIndex: 1 },
      { id: "c9", question: "If you find a critical safety defect, the correct action is to:", options: ["Operate anyway and report later", "Do not operate; notify and correct before dispatch", "Let another driver take it without telling them", "Reset the checklist and proceed"], correctIndex: 1 },
      { id: "c10", question: "Work zone speed reductions exist because:", options: ["They are optional suggestions", "Conditions change quickly and hazards increase", "They are only for passenger cars", "They don’t apply to CDL vehicles"], correctIndex: 1 },
    ],
    certificate: { eligible: true, kind: "standard", label: "CDL Prep Certificate of Completion" },
  },

  // Default coverage for the remaining catalog courses
  pmt: {
    topics: ["leadership", "documentation", "planning", "communication", "work zone safety"],
    study: [
      { title: "Leadership and Crew Communication", body: "PMT-level leadership is visible and consistent.\n\n- Set expectations early.\n- Confirm roles and job hazards.\n- Use clear briefings and repeat critical instructions.\n- Document changes and maintain traceability." },
      { title: "Documentation Discipline", body: "A professional work zone is documented.\n\n- DVIR and equipment readiness.\n- Job safety analysis (JSA).\n- Incident documentation and corrective action.\n- Time tracking integrity." },
    ],
    resources: [],
    requiresTest: false,
    quiz: [],
    certificate: { eligible: true, kind: "standard", label: "PMT Certificate of Completion" },
  },

  ttc: {
    topics: ["traffic control", "work zone safety", "cones", "tapers", "signage", "lane control"],
    study: [
      { title: "Temporary Traffic Control Foundations", body: "Understand device spacing, tapers, and safe transitions.\n\nFollow the plan, verify placement, and maintain the zone." },
    ],
    resources: [{ title: "MUTCD (Reference)", href: "https://mutcd.fhwa.dot.gov/", label: "MUTCD" }],
    requiresTest: false,
    quiz: [],
    certificate: { eligible: true, kind: "standard", label: "TTC Certificate of Completion" },
  },

  night_work: {
    topics: ["night work", "visibility", "lighting", "traffic control"],
    study: [
      { title: "Night Work Safety", body: "Night operations increase risk.\n\n- Verify lighting plan.\n- Increase PPE visibility.\n- Reduce speed through the zone.\n- Assign spotters when equipment is active." },
    ],
    resources: [],
    requiresTest: false,
    quiz: [],
    certificate: { eligible: true, kind: "standard", label: "Night Work Certificate of Completion" },
  },

  dvir: {
    topics: ["dvir", "vehicle inspection", "documentation", "safety"],
    study: [
      { title: "DVIR Best Practices", body: "DVIR is not optional.\n\n- Inspect tires, fluids, brakes, mirrors, lights.\n- Record defects accurately.\n- Do not operate unsafe vehicles." },
    ],
    resources: [],
    requiresTest: false,
    quiz: [],
    certificate: { eligible: true, kind: "standard", label: "DVIR Completion Certificate" },
  },

  harassment: {
    topics: ["hr", "professional conduct", "workplace harassment", "reporting"],
    study: [
      { title: "Professional Conduct", body: "Respectful conduct is mandatory.\n\n- Know what harassment is.\n- Report concerns early.\n- Maintain professionalism on-site and in messaging." },
    ],
    resources: [{ title: "EEOC Harassment Guidance (Reference)", href: "https://www.eeoc.gov/harassment", label: "EEOC" }],
    requiresTest: false,
    quiz: [],
    certificate: { eligible: false, kind: "standard", label: "Completion Acknowledgement" },
  },
};

function percent(n: number) {
  return Math.round(n * 100);
}

function safeNameFromUser(user: any, profile: any | undefined | null) {
  return (
    profile?.full_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Crew Member"
  );
}

function formatDateISO(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeCertId(courseId: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${courseId.toUpperCase()}-${stamp}`;
}

function downloadCertificatePDF(args: {
  kind: "standard" | "pocket";
  courseTitle: string;
  userName: string;
  completionDate: string;
  certId: string;
  scorePct: number;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  if (args.kind === "pocket") {
    // pocket: compact, wallet-friendly layout
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Work Zone OS", 40, 52);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Pocket Certificate", 40, 74);

    doc.setDrawColor(255, 193, 7);
    doc.setLineWidth(2);
    doc.rect(32, 32, 540, 240);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(args.courseTitle, 40, 120);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Name: ${args.userName}`, 40, 150);
    doc.text(`Completed: ${args.completionDate}`, 40, 172);
    doc.text(`Score: ${args.scorePct}%`, 40, 194);
    doc.text(`Certificate ID: ${args.certId}`, 40, 216);

    doc.setFontSize(10);
    doc.text("This certificate verifies successful completion of required training.", 40, 250);

    doc.save(`${args.courseTitle.replace(/\s+/g, "_")}_POCKET_CERT.pdf`);
    return;
  }

  // standard letter certificate
  doc.setDrawColor(255, 193, 7);
  doc.setLineWidth(3);
  doc.rect(36, 36, 540, 720);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Certificate of Completion", 306, 120, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("This certifies that", 306, 190, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(args.userName, 306, 230, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("has successfully completed", 306, 270, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(args.courseTitle, 306, 310, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Completion Date: ${args.completionDate}`, 306, 360, { align: "center" });
  doc.text(`Score: ${args.scorePct}%`, 306, 382, { align: "center" });
  doc.text(`Certificate ID: ${args.certId}`, 306, 404, { align: "center" });

  doc.setFontSize(10);
  doc.text("Work Zone OS Training Academy", 306, 720, { align: "center" });

  doc.save(`${args.courseTitle.replace(/\s+/g, "_")}_CERTIFICATE.pdf`);
}

function loadCompletionState(courseId: string) {
  try {
    const raw = localStorage.getItem(`wzos_course_complete_${courseId}`);
    if (!raw) return null;
    return JSON.parse(raw) as { completedAt: string; certId: string; scorePct: number };
  } catch {
    return null;
  }
}

function saveCompletionState(courseId: string, state: any) {
  localStorage.setItem(`wzos_course_complete_${courseId}`, JSON.stringify(state));
}


function loadQuizState(courseId: string) {
  try {
    const raw = localStorage.getItem(`wzos_training_quiz_${courseId}`);
    if (!raw) return null;
    return JSON.parse(raw) as { passed: boolean; scorePct: number; certId?: string; completedAt?: string };
  } catch {
    return null;
  }
}

function saveQuizState(courseId: string, state: any) {
  localStorage.setItem(`wzos_training_quiz_${courseId}`, JSON.stringify(state));
}

function QuizBlock({
  courseId,
  courseTitle,
  quiz,
  certificate,
}: {
  courseId: string;
  courseTitle: string;
  quiz: QuizQuestion[];
  certificate: CourseMaterials["certificate"];
}) {
  const { user, profile } = useAuth();
  const userName = safeNameFromUser(user, profile);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ scorePct: number; passed: boolean; certId?: string; completedAt?: string }>(() => {
    const saved = loadQuizState(courseId);
    return saved ?? { scorePct: 0, passed: false };
  });

  const requiredCorrect = Math.ceil(quiz.length * PASS_THRESHOLD);

  function submit() {
    const correct = quiz.reduce((acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0), 0);
    const scorePct = quiz.length ? Math.round((correct / quiz.length) * 100) : 0;
    const passed = correct >= requiredCorrect;

    const completedAt = formatDateISO(new Date());
    const certId = passed ? (result.certId ?? makeCertId(courseId)) : undefined;

    const next = { scorePct, passed, certId, completedAt };
    setResult(next);
    saveQuizState(courseId, next);
    setSubmitted(true);
  }

  const canDownload = certificate.eligible && result.passed && result.certId;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-orange-200/80">Required Test</div>
          <p className="text-sm text-orange-100/80">
            Pass at least <span className="font-semibold text-orange-100">{percent(PASS_THRESHOLD)}%</span> to unlock certificate.
          </p>
        </div>

        {canDownload ? (
          <Button
            onClick={() =>
              downloadCertificatePDF({
                kind: certificate.kind,
                courseTitle: certificate.label || courseTitle,
                userName,
                completionDate: result.completedAt || formatDateISO(new Date()),
                certId: result.certId!,
                scorePct: result.scorePct,
              })
            }
            className="bg-orange-400 text-black hover:bg-orange-300"
          >
            Download {certificate.kind === "pocket" ? "Pocket " : ""}Certificate (PDF)
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-orange-500/25 bg-black/50 px-3 py-2 text-xs text-orange-100/80">
            <ClipboardCheck className="w-4 h-4 text-orange-300" />
            Complete the test to unlock
          </div>
        )}
      </div>

      <div className="space-y-4">
        {quiz.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-orange-500/20 bg-black/55 p-4">
            <div className="text-sm font-semibold text-white mb-3">
              {idx + 1}. {q.question}
            </div>
            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                const showCorrect = (submitted || result.passed) && answers[q.id] !== undefined;
                const isCorrect = i === q.correctIndex;
                const isWrongPick = selected && !isCorrect && showCorrect;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (result.passed) return; // locked after passing
                      setAnswers((prev) => ({ ...prev, [q.id]: i }));
                    }}
                    className={[
                      "text-left rounded-lg border px-3 py-2 text-sm transition",
                      selected ? "border-orange-400/60 bg-orange-500/10" : "border-orange-500/15 bg-black/35 hover:bg-black/50",
                      isWrongPick ? "border-red-500/50" : "",
                      showCorrect && isCorrect ? "border-emerald-500/50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-orange-50/90">{opt}</span>
                      {showCorrect && isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-orange-100/80">
          Score: <span className="font-semibold text-white">{result.scorePct}%</span>{" "}
          {result.passed ? (
            <span className="inline-flex items-center gap-2 text-emerald-300 ml-2">
              <CheckCircle2 className="w-4 h-4" />
              Passed
            </span>
          ) : submitted ? (
            <span className="text-orange-200/80 ml-2">Not passed yet—review and retry.</span>
          ) : null}
        </div>

        <Button onClick={submit} disabled={quiz.length === 0 || Object.keys(answers).length < quiz.length || result.passed}>
          {result.passed ? "Completed" : "Submit Test"}
        </Button>
      </div>
    </div>
  );
}


function CompletionCertificateBlock({
  courseId,
  courseTitle,
  certificate,
}: {
  courseId: string;
  courseTitle: string;
  certificate: CourseMaterials["certificate"];
}) {
  const { user, profile } = useAuth();
  const userName = safeNameFromUser(user, profile);

  const [state, setState] = useState<{ completedAt: string; certId: string; scorePct: number } | null>(() =>
    loadCompletionState(courseId)
  );

  function markComplete() {
    const completedAt = formatDateISO(new Date());
    const certId = state?.certId ?? makeCertId(courseId);
    const next = { completedAt, certId, scorePct: 100 };
    setState(next);
    saveCompletionState(courseId, next);
  }

  const canDownload = Boolean(state?.certId);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-orange-200/80">Certificate</div>
          <p className="text-sm text-orange-100/80">
            Mark complete to issue your certificate for records and compliance.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={markComplete} disabled={Boolean(state)} className="bg-orange-400 text-black hover:bg-orange-300">
            {state ? "Completed" : "Mark Complete"}
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              downloadCertificatePDF({
                kind: certificate.kind,
                courseTitle: certificate.label || courseTitle,
                userName,
                completionDate: state?.completedAt || formatDateISO(new Date()),
                certId: state?.certId || makeCertId(courseId),
                scorePct: 100,
              })
            }
            disabled={!canDownload}
          >
            Download Certificate (PDF)
          </Button>
        </div>
      </div>

      {state ? (
        <div className="rounded-xl border border-emerald-500/25 bg-black/55 p-4 text-sm text-emerald-200">
          <div className="flex items-center gap-2 font-semibold text-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
            Recorded as completed on {state.completedAt}
          </div>
          <div className="text-xs text-emerald-200/80 mt-2">Certificate ID: {state.certId}</div>
        </div>
      ) : (
        <div className="rounded-xl border border-orange-500/15 bg-black/55 p-4 text-sm text-orange-100/75">
          When you are ready, mark this course complete. If your organization requires supervisor verification, complete that step before marking done.
        </div>
      )}
    </div>
  );
}

export function CourseDetailContent({ courseId }: { courseId: string }) {
  const { user, loading } = useAuth();
  const shouldRedirect = !loading && !user;

  const course: Course | undefined = (trainingCatalog as any)?.courses?.find((c: any) => c.course_id === courseId);

  const materials = COURSE_MATERIALS[courseId] ?? {
    topics: [],
    study: [],
    resources: [],
    requiresTest: false,
    quiz: [],
    certificate: { eligible: Boolean(course?.certificate_eligible), kind: "standard", label: "Certificate of Completion" },
  };

  const videos = useMemo(() => {
    if (!materials.topics?.length) return [];
    const set = new Set(materials.topics.map((t) => t.toLowerCase()));
    return trainingVideos
      .filter((v) => v.topics?.some((t) => set.has(String(t).toLowerCase())))
      .slice(0, 10);
  }, [materials.topics]);

  if (shouldRedirect) return <Navigate to="/" replace />;

  if (!course) {
    return (
      <div className="space-y-4 text-orange-100">
        <GlassCard className="p-5 bg-black/60">
          <h1 className="text-xl font-semibold text-white">Course not found</h1>
          <p className="text-sm text-orange-100/75">The requested course does not exist.</p>
        </GlassCard>
      </div>
    );
  }

  // Certificate is eligible if catalog says so OR explicitly required by product design (CDL + Flagger).
  const certificateEligible = Boolean(course.certificate_eligible || course.course_id === "cdl_prep" || course.course_id === "flagger");

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5 text-orange-100">
          <GlassCard className="p-6 space-y-4 bg-black/60 border border-orange-500/25">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-200/80">Course</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{course.title}</h1>
                <p className="text-sm text-orange-100/75">{course.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-orange-500/25 bg-black/50 px-3 py-2 text-xs text-orange-100/80">
                  <ShieldCheck className="w-4 h-4 text-orange-300" />
                  {course.estimated_minutes} min
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-orange-500/25 bg-black/50 px-3 py-2 text-xs text-orange-100/80">
                  <Award className="w-4 h-4 text-orange-300" />
                  {certificateEligible ? "Certificate Path" : "Study Path"}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Study */}
          <GlassCard className="p-6 bg-black/60 border border-orange-500/25 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-300" />
              <h2 className="text-lg font-semibold text-white">Study Material</h2>
            </div>

            {materials.study.length ? (
              <div className="space-y-4">
                {materials.study.map((s) => (
                  <div key={s.title} className="rounded-xl border border-orange-500/15 bg-black/50 p-4">
                    <div className="text-sm font-semibold text-white mb-2">{s.title}</div>
                    <div className="text-sm text-orange-100/80 whitespace-pre-line">{s.body}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-orange-100/75">This course currently has no study text. Use the videos and ask the assistant for guidance.</div>
            )}
          </GlassCard>

          {/* Videos */}
          {videos.length ? (
            <GlassCard className="p-6 bg-black/60 border border-orange-500/25 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-orange-300" />
                  <h2 className="text-lg font-semibold text-white">Recommended Videos</h2>
                </div>
                <Link to="/training/videos" className="text-sm text-orange-200 hover:text-orange-100 inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Open full library
                </Link>
              </div>

              <div className="grid gap-3">
                {videos.map((v) => (
                  <a
                    key={v.id}
                    href={v.url || `https://www.youtube.com/watch?v=${v.youtubeId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-orange-500/15 bg-black/50 p-4 hover:bg-black/60 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{v.title}</div>
                        <div className="text-xs text-orange-100/70 mt-1">{v.description}</div>
                      </div>
                      <div className="shrink-0 text-xs rounded-full border border-orange-500/25 bg-black/60 px-3 py-1 text-orange-200/90">
                        {v.level}
                      </div>
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-orange-200/70 mt-3">
                      Open video
                    </div>
                  </a>
                ))}
              </div>
            </GlassCard>
          ) : null}

          {/* References */}
          {materials.resources.length ? (
            <GlassCard className="p-6 bg-black/60 border border-orange-500/25 space-y-3">
              <div className="text-lg font-semibold text-white">Reference Links</div>
              <div className="grid gap-2">
                {materials.resources.map((r) => (
                  <a
                    key={r.href}
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-orange-500/15 bg-black/50 px-4 py-3 hover:bg-black/60 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-orange-50/90">{r.title}</div>
                      {r.label ? (
                        <div className="text-[11px] uppercase tracking-[0.14em] text-orange-200/80">{r.label}</div>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            </GlassCard>
          ) : null}

          {/* Test + Certificate */}
          {materials.requiresTest && materials.quiz.length ? (
            <GlassCard className="p-6 bg-black/60 border border-orange-500/25 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-orange-300" />
                <h2 className="text-lg font-semibold text-white">Test and Certificate</h2>
              </div>

              <QuizBlock
                courseId={course.course_id}
                courseTitle={course.title}
                quiz={materials.quiz}
                certificate={{
                  eligible: certificateEligible,
                  kind: materials.certificate.kind,
                  label: materials.certificate.label,
                }}
              />
            </GlassCard>
          ) : certificateEligible ? (
            <GlassCard className="p-6 bg-black/60 border border-orange-500/25 space-y-4">
              <CompletionCertificateBlock
                courseId={course.course_id}
                courseTitle={course.title}
                certificate={{
                  eligible: certificateEligible,
                  kind: materials.certificate.kind,
                  label: materials.certificate.label,
                }}
              />
            </GlassCard>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-5">
          <GlassCard className="p-5 bg-black/60 border border-orange-500/25">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <GraduationCap className="w-4 h-4 text-orange-300" />
              How to complete
            </div>
            <ol className="mt-3 space-y-2 text-sm text-orange-100/80 list-decimal list-inside">
              <li>Review the study material.</li>
              <li>Watch recommended videos (or open the full library).</li>
              {materials.requiresTest ? <li>Take the test and pass with {percent(PASS_THRESHOLD)}% or higher.</li> : <li>Confirm completion with your supervisor.</li>}
              {certificateEligible ? <li>Download your certificate for records.</li> : <li>Continue to the next course in your path.</li>}
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="space-y-4 text-orange-100">
        <Link to="/training" className="inline-flex items-center gap-2 text-sm text-orange-200 hover:text-orange-100">
          <ArrowLeft className="w-4 h-4" /> Back to Training Center
        </Link>
        <GlassCard className="p-5 bg-black/60">
          <h1 className="text-xl font-semibold text-white">Course not found</h1>
          <p className="text-sm text-orange-100/75">The requested course does not exist.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-orange-100">
      <Link to="/training" className="inline-flex items-center gap-2 text-sm text-orange-200 hover:text-orange-100">
        <ArrowLeft className="w-4 h-4" /> Back to Training Center
      </Link>
      <CourseDetailContent courseId={id} />
    </div>
  );
}
