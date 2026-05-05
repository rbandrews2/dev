import React, { useState, useEffect } from 'react';
import { QuizModal } from './QuizModal';
import { CertificateTemplate } from '../certificates/CertificateTemplate';
import { quizzes } from '@/data/quizData';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ClipboardCheck } from 'lucide-react';


interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: any;
}

const TrainingModal: React.FC<TrainingModalProps> = ({ isOpen, onClose, module }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [trainingContent, setTrainingContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    if (isOpen && module) {
      fetchTrainingContent();
    }
  }, [isOpen, module]);

  const fetchTrainingContent = async () => {
    try {
      const { data, error } = await supabase
        .from('training_modules')
        .select('content')
        .eq('title', module.title)
        .single();
      
      if (data) {
        setTrainingContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching training content:', error);
    }
  };

  if (!isOpen || !module) return null;

  const hasQuiz = quizzes[module.id as keyof typeof quizzes];
  const isCompleted = module.progress === 100;

  const handleQuizComplete = (score: number) => {
    const percentage = (score / quizzes[module.id as keyof typeof quizzes].questions.length) * 100;
    setQuizScore(percentage);
    if (percentage >= 70) {
      setShowCertificate(true);
    }
    setShowQuiz(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{module.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{module.category} • {module.duration}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {showCertificate && quizScore !== null ? (
              <CertificateTemplate
                userName="Current User"
                courseName={module.title}
                completionDate={new Date().toLocaleDateString()}
                certificateId={`CERT-${module.id}-${Date.now()}`}
                score={quizScore}
              />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Training Content
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Assessment
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-6 mt-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700">{module.description}</p>
                  </div>

                  {trainingContent && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-4">Course Material</h3>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                        {trainingContent}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Progress</p>
                      <p className="text-2xl font-bold text-blue-900">{module.progress}%</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-600 font-medium">Due Date</p>
                      <p className="text-2xl font-bold text-orange-900">{module.dueDate}</p>
                    </div>
                  </div>

                  <button className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600">
                    {module.progress === 0 ? 'Start Training' : module.progress === 100 ? 'Review Material' : 'Continue Training'}
                  </button>
                </TabsContent>

                <TabsContent value="quiz" className="space-y-6 mt-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Assessment Information</h3>
                    <p className="text-gray-700 mb-4">
                      Test your knowledge of {module.title}. You need a score of 70% or higher to earn your certificate.
                    </p>
                    {hasQuiz ? (
                      <button 
                        onClick={() => setShowQuiz(true)}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                      >
                        Start Assessment
                      </button>
                    ) : (
                      <p className="text-gray-600">Assessment coming soon for this module.</p>
                    )}
                  </div>

                  {isCompleted && (
                    <button 
                      onClick={() => setShowCertificate(true)}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
                    >
                      View Your Certificate
                    </button>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {hasQuiz && (
        <QuizModal
          open={showQuiz}
          onClose={() => setShowQuiz(false)}
          title={`${module.title} - Quiz`}
          questions={quizzes[module.id as keyof typeof quizzes].questions}
          onComplete={handleQuizComplete}
        />
      )}
    </>
  );
};

export default TrainingModal;
