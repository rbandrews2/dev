import { TrainingModuleContent, normalizeYouTubeId } from "@/lib/training/trainingContent";

export const CDL_PRETRIP_YOUTUBE_ID = normalizeYouTubeId(
  "https://youtu.be/h6QLwlQW1rY?si=Y7L819GSkidJ-TI3"
);

export const cdlModuleDefaultContent: TrainingModuleContent = {
  version: 1,
  items: [
    {
      id: "cdl-pretrip-video",
      type: "video",
      title: "Pre-Trip Inspection Process (Required before Exam)",
      requirement: "required",
      trigger: "before_exam",
      scope: "cdl",
      youtubeId: CDL_PRETRIP_YOUTUBE_ID,
    },
  ],
};

export type CdlQuestion = {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

// Starter pool (expandable by admin editor later)
export const cdlQuestionBank: CdlQuestion[] = [
  {
    id: "gk-001",
    category: "General Knowledge",
    question: "What does a diamond-shaped road sign typically indicate?",
    options: [
      "Regulatory information",
      "Warning",
      "Guide information",
      "Services"
    ],
    correctIndex: 1,
    explanation:
      "Diamond-shaped signs are generally used for warnings about hazards or changes in road conditions ahead.",
  },
  {
    id: "gk-002",
    category: "General Knowledge",
    question: "When should you perform a pre-trip inspection?",
    options: [
      "Only if the vehicle feels unsafe",
      "Before every trip and at least once each day",
      "Only before long trips",
      "Only after repairs"
    ],
    correctIndex: 1,
    explanation:
      "A pre-trip inspection should be performed before operating the vehicle to catch safety issues early; CDL guidance emphasizes daily checks.",
  },
  {
    id: "ab-001",
    category: "Air Brakes",
    question: "What is the minimum air pressure required before you can safely operate most air brake systems?",
    options: ["60 PSI", "80 PSI", "100 PSI", "120 PSI"],
    correctIndex: 2,
    explanation:
      "Most CDL training materials reference around 100 PSI as a minimum for safe operation, though exact values depend on the vehicle; always follow manufacturer guidance.",
  },
  {
    id: "rs-001",
    category: "Road Signs",
    question: "An octagonal red sign means:",
    options: ["Yield", "Stop", "Do Not Enter", "Railroad Crossing"],
    correctIndex: 1,
    explanation:
      "The octagonal red sign is universally recognized as a STOP sign.",
  },
];

export const CDL_EXAM_DEFAULTS = {
  questionCount: 25,
  timeMinutes: 30,
  passPercent: 80,
};
