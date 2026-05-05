import DVIRpage from "@/components/dvir/DVIRpage";
import { useAuth } from "@/contexts/AuthContext";
import SignInGate from "@/components/auth/SignInGate";
import { FileText } from "lucide-react";

export default function DVIRFormPage() {
  const { user } = useAuth() as any;

  if (!user) {
    return (
      <SignInGate
        label="DVIR"
        title="Vehicle inspection reports."
        description="Sign in to complete DVIR checks and log issues."
        icon={<FileText className="w-5 h-5" />}
      />
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <DVIRpage />
    </div>
  );
}
