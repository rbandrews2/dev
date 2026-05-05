import trainingCatalog from "@/data/trainingCatalog.json";
import { trainingVideos } from "@/data/trainingVideos";

export type ResourceLink = { label: string; href: string };
export type StudySection = { title: string; body: string };
export type CourseMaterial = {
  courseId: string;
  title: string;
  description: string;
  topics: string[];
  study: StudySection[];
  resources: ResourceLink[];
  requiresTest: boolean;
  certificateEligible: boolean;
  certificateType?: string | null;
  videoTopics: string[];
};

function baseFor(courseId: string): CourseMaterial {
  const c = (trainingCatalog as any).courses?.find((x: any) => x.course_id === courseId);
  return {
    courseId,
    title: c?.title ?? courseId,
    description: c?.description ?? "",
    topics: c?.topics ?? [c?.category ?? "training"],
    study: [{ title: "Overview", body: c?.description ?? "Study material and recommended videos are provided for this course." }],
    resources: [],
    requiresTest: Boolean(c?.requires_test),
    certificateEligible: Boolean(c?.certificate_eligible),
    certificateType: c?.certificate_type ?? null,
    videoTopics: c?.topics ?? [c?.category ?? "training"],
  };
}

const curated: Record<string, Partial<CourseMaterial>> = {
  pmt: {
    study: [
      { title: "Role & Responsibilities", body: "Coordinate daily operations, validate field conditions against plans, and keep documentation accurate and timely." },
      { title: "Crew Briefings", body: "Run pre-task briefings: scope, hazards, traffic changes, escape paths, communications, PPE, and radio checks." },
      { title: "Documentation & Compliance", body: "Ensure JSA/DVIR/incident forms are completed and deviations are documented with corrective actions." },
    ],
    videoTopics: ["leadership","documentation","planning","communication","safety"],
  },
  flagger: {
    study: [
      { title: "Positioning & Visibility", body: "Stay outside the traveled way when possible with clear sight lines and a safe escape route." },
      { title: "Signals & Communication", body: "Use consistent STOP/SLOW paddle movements and radio calls. Confirm hand signals with the crew before starting." },
      { title: "Incident Readiness", body: "Know emergency procedures and how to stop traffic safely if a vehicle breaches the taper." },
    ],
    videoTopics: ["flagger","traffic_control","signals","safety"],
  },
  cdl_prep: {
    study: [
      { title: "Pre‑Trip Inspection", body: "Use a consistent walk‑around sequence: engine compartment, cab checks, lights, tires, brakes/suspension, coupling components." },
      { title: "Air Brakes & Systems", body: "Understand air pressure build, low‑air warnings, brake lag, and safe stopping practices." },
      { title: "Work‑Zone Driving", body: "Maintain safe following distance, obey reduced limits, anticipate lane shifts, and coordinate with spotters." },
    ],
    videoTopics: ["cdl","driving","pre_trip","safety","equipment"],
  },
  ttc: {
    study: [
      { title: "Tapers & Channelization", body: "Place devices to provide clear guidance through transitions; verify spacing, alignment, and retroreflectivity." },
      { title: "Signs & Work‑Zone Flow", body: "Confirm signs match the plan, are visible, and are placed at appropriate distances for driver decision-making." },
    ],
    videoTopics: ["traffic_control","setup","cones","signing","safety"],
  },
  night_work: {
    study: [
      { title: "Lighting & Glare", body: "Use lighting that supports visibility without blinding drivers; minimize glare and ensure shadow-free work areas." },
      { title: "Fatigue Controls", body: "Use breaks, hydration, and task rotation; use buddy checks and ensure reflective gear remains visible." },
    ],
    videoTopics: ["night_work","visibility","lighting","safety"],
  },
  harassment: {
    study: [
      { title: "Professional Conduct", body: "Maintain respectful communication. Harassment and retaliation are not tolerated." },
      { title: "Reporting", body: "Document incidents factually and report promptly using established channels. Support confidentiality." },
    ],
    videoTopics: ["hr","conduct","workplace"],
  },
  dvir: {
    study: [
      { title: "Inspection Routine", body: "Inspect tires, lights, brakes, fluids, mirrors, and safety equipment. Report defects immediately and document corrections." },
      { title: "Defect Escalation", body: "Unsafe vehicles are removed from service until repairs are verified. Use notes and photos when available." },
    ],
    videoTopics: ["dvir","equipment","inspection","maintenance","safety"],
  },
  incident: {
    study: [
      { title: "Immediate Response", body: "Secure the scene, provide aid, notify supervisors, and preserve evidence. Avoid speculation in notes." },
      { title: "Documentation", body: "Record time, location, involved parties, witness info, and photos. Submit the incident form within policy timelines." },
    ],
    videoTopics: ["incident","reporting","investigation","safety"],
  },
  jsa: {
    study: [
      { title: "Hazard Identification", body: "Identify hazards before work begins: traffic exposure, equipment movement, pinch points, weather, and visibility." },
      { title: "Controls", body: "Apply controls: PPE, spotters, barriers, communication, and safe work methods. Re-brief when conditions change." },
    ],
    videoTopics: ["jsa","hazard_analysis","safety_briefing","safety"],
  },
};

export function getCourseMaterial(courseId: string): CourseMaterial {
  const c = (trainingCatalog as any).courses?.find((x: any) => x.course_id === courseId);
  const base = baseFor(courseId);
  const patch = curated[courseId] ?? {};
  return {
    ...base,
    ...patch,
    title: c?.title ?? base.title,
    description: c?.description ?? base.description,
    topics: c?.topics ?? base.topics,
    requiresTest: Boolean(c?.requires_test),
    certificateEligible: Boolean(c?.certificate_eligible),
    certificateType: c?.certificate_type ?? null,
    videoTopics: (patch as any).videoTopics ?? (c?.topics ?? base.videoTopics),
  };
}

export function getVideosForTopics(topics: string[]) {
  const tset = new Set((topics ?? []).map(t => String(t).toLowerCase()));
  return (trainingVideos as any[]).filter(v => {
    const vt = (v.topics ?? v.tags ?? []).map((x: any) => String(x).toLowerCase());
    return vt.some((x: string) => tset.has(x));
  });
}
