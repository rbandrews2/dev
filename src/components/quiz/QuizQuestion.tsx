import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface QuizQuestionProps {
  question: string;
  options: string[];
  selectedAnswer: string;
  onAnswerSelect: (answer: string) => void;
  questionNumber: number;
  showCorrect?: boolean;
  correctAnswer?: string;
}

export function QuizQuestion({ question, options, selectedAnswer, onAnswerSelect, questionNumber, showCorrect, correctAnswer }: QuizQuestionProps) {
  return (
    <Card className="p-6 mb-4">
      <h3 className="font-semibold text-lg mb-4">Question {questionNumber}: {question}</h3>
      <RadioGroup value={selectedAnswer} onValueChange={onAnswerSelect}>
        {options.map((option, idx) => {
          const isCorrect = showCorrect && option === correctAnswer;
          const isWrong = showCorrect && option === selectedAnswer && option !== correctAnswer;
          return (
            <div key={idx} className={`flex items-center space-x-2 p-3 rounded ${isCorrect ? 'bg-green-50 border border-green-300' : isWrong ? 'bg-red-50 border border-red-300' : ''}`}>
              <RadioGroupItem value={option} id={`q${questionNumber}-${idx}`} disabled={showCorrect} />
              <Label htmlFor={`q${questionNumber}-${idx}`} className="flex-1 cursor-pointer">{option}</Label>
            </div>
          );
        })}
      </RadioGroup>
    </Card>
  );
}
