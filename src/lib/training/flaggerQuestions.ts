export type TrainingQuestion = {
  id: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export const flaggerQuestions: TrainingQuestion[] = [
  {
    id: "f1",
    question: "A driver fails to slow down approaching your station. What is the safest initial action?",
    choices: [
      "Step into the lane to force the driver to stop",
      "Maintain your escape route, increase visibility, use standard STOP signaling, and alert the crew",
      "Turn your back to avoid distraction",
      "Run toward the vehicle to get attention"
    ],
    answer: 1,
    explanation: "Maintain visibility and an escape route; alert crew and follow standard procedures."
  },
  {
    id: "f2",
    question: "Where should a flagger position themselves relative to live traffic?",
    choices: [
      "In the live lane so drivers must stop",
      "On the shoulder with clear sight lines, outside the traveled way when possible, with an escape route",
      "Behind a parked truck in the taper",
      "Anywhere as long as the paddle is visible"
    ],
    answer: 1,
    explanation: "Best practice is outside the traveled way with visibility and an escape path."
  },
  {
    id: "f3",
    question: "When should radio communication protocols be confirmed?",
    choices: [
      "Only after an incident",
      "At the end of the shift",
      "Before work begins during the pre-task briefing",
      "Never, it slows the job"
    ],
    answer: 2,
    explanation: "Confirm communication before operations begin to prevent confusion."
  },
  {
    id: "f4",
    question: "What is the correct way to display the STOP paddle?",
    choices: [
      "Swing it side to side rapidly",
      "Hold it steadily, face traffic, and stand in a visible, stable position",
      "Hold it low near your knees",
      "Point it toward the ground so it reflects light"
    ],
    answer: 1,
    explanation: "A stable, steady STOP display is the standard for driver comprehension."
  },
  {
    id: "f5",
    question: "If traffic queues build beyond expectations, what should you do?",
    choices: [
      "Ignore it and continue",
      "Immediately shorten the taper",
      "Notify the supervisor and adjust operations per plan to maintain safety and flow",
      "Wave cars through quickly regardless of crew movement"
    ],
    answer: 2,
    explanation: "Escalate and adjust safely per plan and supervision."
  }
];
