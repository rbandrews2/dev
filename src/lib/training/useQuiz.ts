import { useMemo, useState } from "react";

export type TrainingQuestion = {
  id: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export function useQuiz(questions: TrainingQuestion[], passThreshold = 80) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function answerQuestion(id: string, index: number) {
    setAnswers(a => ({ ...a, [id]: index }));
  }

  const score = useMemo(() => {
    return Object.entries(answers).filter(([id, idx]) => {
      const q = questions.find(q => q.id === id);
      return q && q.answer === idx;
    }).length;
  }, [answers, questions]);

  const percent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((score / questions.length) * 100);
  }, [score, questions.length]);

  const passed = percent >= passThreshold;

  return { answers, answerQuestion, score, percent, passed };
}
