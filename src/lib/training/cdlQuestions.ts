
export type CDLQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: number;
};

export const cdlQuestions: CDLQuestion[] = [
  {
    id: "q1",
    question: "What is the minimum tread depth for front tires on a commercial vehicle?",
    options: ["2/32 inch", "4/32 inch", "6/32 inch"],
    answer: 1
  },
  {
    id: "q2",
    question: "What does ABS stand for?",
    options: ["Automatic Brake System", "Anti-lock Braking System", "Advanced Brake Safety"],
    answer: 1
  }
];
