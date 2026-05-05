export type TrainingRequirement = "required" | "recommended" | "optional";
export type TrainingTrigger = "before_quiz" | "after_quiz" | "before_exam" | "always";

export type TrainingItem = {
  id: string;
  type: "video" | "lesson" | "quiz";
  title: string;
  requirement: TrainingRequirement;
  trigger: TrainingTrigger;
  /** optional scope, e.g. "cdl" or "work_zone_safety" */
  scope?: string;
  /** for video items */
  youtubeId?: string;
  /** for lesson items */
  body?: string;
};

export type TrainingModuleContent = {
  version: 1;
  items: TrainingItem[];
};

export function normalizeYouTubeId(input: string): string {
  // Accept: full URL, youtu.be short, embed, or raw id
  try {
    if (!input) return "";
    // raw id
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id;
    }
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
  } catch {
    // ignore
  }
  return "";
}

export function parseTrainingContent(raw: unknown): TrainingModuleContent {
  // Backward compatibility: legacy content may be a plain string.
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { version: 1, items: [] };
    return {
      version: 1,
      items: [
        {
          id: "legacy-lesson",
          type: "lesson",
          title: "Course Material",
          requirement: "optional",
          trigger: "always",
          body: trimmed,
        },
      ],
    };
  }

  if (raw && typeof raw === "object") {
    const maybe = raw as any;
    if (maybe.version === 1 && Array.isArray(maybe.items)) {
      return {
        version: 1,
        items: maybe.items,
      };
    }
  }

  return { version: 1, items: [] };
}

export function stringifyTrainingContent(content: TrainingModuleContent): any {
  // Store as JSON compatible with Supabase JSONB.
  return content;
}
