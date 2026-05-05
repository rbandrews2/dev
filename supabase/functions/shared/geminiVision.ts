import { mustGetEnv, getEnv } from "./env.ts";

export type GeminiVisionInput = {
  imageBase64: string; // raw base64 OR data URL
  mimeType: string;    // "image/jpeg" | "image/png" | etc
  prompt: string;
  system?: string;
};

export type GeminiVisionOutput = {
  text: string;
  raw: unknown;
};

const MAX_INLINE_BYTES = 18 * 1024 * 1024;

function stripDataUrl(b64: string) {
  return b64.replace(/^data:[^;]+;base64,/, "").trim();
}

function approxBytesFromBase64(b64: string) {
  return Math.floor((b64.length * 3) / 4);
}

export async function geminiVisionDescribe(input: GeminiVisionInput): Promise<GeminiVisionOutput> {
  const apiKey = mustGetEnv("GEMINI_API_KEY");
  const model = getEnv("GEMINI_VISION_MODEL", "gemini-2.5-flash")!;

  const cleaned = stripDataUrl(input.imageBase64);
  const bytes = approxBytesFromBase64(cleaned);
  if (bytes > MAX_INLINE_BYTES) {
    throw new Error(`IMAGE_TOO_LARGE: ${bytes} bytes`);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const systemText =
    input.system ??
    [
      "You are Atlas AI inside Work Zone OS.",
      "Analyze the image practically and safely.",
      "Do not claim official inspections/certifications or DOT determinations.",
      "If uncertain, ask one clarifying question.",
    ].join("\n");

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: input.mimeType, data: cleaned } },
          { text: input.prompt },
        ],
      },
    ],
    system_instruction: { parts: [{ text: systemText }] },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GEMINI_HTTP_${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join("\n") ?? "";

  return { text, raw: json };
}
