// src/lib/ai/assistantEngine.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const flash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const vision = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision" });

export async function runTextQuery(prompt: string) {
  try {
    const result = await flash.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    console.error("AI text error:", err);
    return "I had trouble processing that request.";
  }
}

export async function runVisionQuery(prompt: string, file: File) {
  try {
    const imgBase64 = await fileToBase64(file);

    const result = await vision.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: file.type,
          data: imgBase64.split(",")[1],
        },
      },
    ]);

    return result.response.text();
  } catch (err: any) {
    console.error("AI vision error:", err);
    return "The image could not be analyzed.";
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}
