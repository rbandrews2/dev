import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CertificateTemplateProps {
  userName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
  score?: number;
}

export function CertificateTemplate({ userName, courseName, completionDate, certificateId, score }: CertificateTemplateProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <Card className="p-12 bg-white border-4 border-amber-400 print:border-amber-600 shadow-lg shadow-neutral-900/40">
        <div className="text-center space-y-6">
          <div className="border-b-2 border-amber-300 pb-4">
            <h1 className="text-4xl font-bold text-neutral-900">Certificate of Completion</h1>
            <p className="text-sm text-neutral-700 mt-2">Work Zone OS Training Academy</p>
          </div>

          <div className="py-8 space-y-4">
            <p className="text-lg text-neutral-700">This certifies that</p>
            <h2 className="text-3xl font-bold text-neutral-900">{userName}</h2>
            <p className="text-lg text-neutral-700">has successfully completed</p>
            <h3 className="text-2xl font-semibold text-amber-700">{courseName}</h3>
            {score !== undefined && (
              <p className="text-md text-neutral-700">
                with a final score of <span className="font-semibold text-amber-700">{score.toFixed(1)}%</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 text-left mt-4">
            <div>
              <p className="text-sm text-neutral-700">Completion Date</p>
              <p className="font-semibold text-neutral-900">{completionDate}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-700">Certificate ID</p>
              <p className="font-mono text-neutral-900">{certificateId}</p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8">
            <div className="text-left">
              <div className="border-t-2 border-neutral-400 w-48 mx-auto mb-2"></div>
              <p className="text-sm text-neutral-700">Training Supervisor</p>
            </div>
            <div className="text-left">
              <div className="border-t-2 border-neutral-400 w-48 mx-auto mb-2"></div>
              <p className="text-sm text-neutral-700">Safety Director</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400">
          Print Certificate
        </Button>
        <Button variant="outline" className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50">
          Download PDF
        </Button>
      </div>
    </div>
  );
}
