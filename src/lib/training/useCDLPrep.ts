
import { useState } from "react";
import { cdlQuestions } from "./cdlQuestions";

export function useCDLPrep() {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function answerQuestion(id: string, index: number) {
    setAnswers(a => ({ ...a, [id]: index }));
  }

  const score = Object.entries(answers).filter(([id, idx]) => {
    const q = cdlQuestions.find(q => q.id === id);
    return q && q.answer === idx;
  }).length;

  const percent = Math.round((score / cdlQuestions.length) * 100);
  const passed = percent >= 80;

  return { answers, answerQuestion, score, percent, passed };
}
