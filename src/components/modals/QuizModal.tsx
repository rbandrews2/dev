import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import { Progress } from '@/components/ui/progress';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  questions: Question[];
  onComplete: (score: number) => void;
}

export function QuizModal({ open, onClose, title, questions, onComplete }: QuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmit = () => {
    const correctCount = questions.filter((q, idx) => q.correctAnswer === answers[idx]).length;
    setScore(correctCount);
    setShowResults(true);
  };

  const handleFinish = () => {
    onComplete(score);
    onClose();
    setCurrentQuestion(0);
    setAnswers(Array(questions.length).fill(''));
    setShowResults(false);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {!showResults ? (
          <div className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</p>
            <QuizQuestion
              question={questions[currentQuestion].question}
              options={questions[currentQuestion].options}
              selectedAnswer={answers[currentQuestion]}
              onAnswerSelect={handleAnswerSelect}
              questionNumber={currentQuestion + 1}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>Previous</Button>
              {currentQuestion < questions.length - 1 ? (
                <Button onClick={handleNext} disabled={!answers[currentQuestion]}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!answers[currentQuestion]}>Submit Quiz</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center p-6 bg-primary/10 rounded-lg">
              <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
              <p className="text-4xl font-bold text-primary">{score}/{questions.length}</p>
              <p className="text-muted-foreground mt-2">{((score / questions.length) * 100).toFixed(0)}% Correct</p>
            </div>
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <QuizQuestion
                  key={idx}
                  question={q.question}
                  options={q.options}
                  selectedAnswer={answers[idx]}
                  onAnswerSelect={() => {}}
                  questionNumber={idx + 1}
                  showCorrect
                  correctAnswer={q.correctAnswer}
                />
              ))}
            </div>
            <Button onClick={handleFinish} className="w-full">Finish</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
