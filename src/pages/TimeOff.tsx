import TimeOffPanel from "@/components/timeoff/TimeOffPanel";
import { useAuth } from "@/contexts/AuthContext";
import SignInGate from "@/components/auth/SignInGate";
import { CalendarClock } from "lucide-react";

export default function TimeOff() {
  const { user } = useAuth() as any;

  if (!user) {
    return (
      <SignInGate
        label="Time Off"
        title="Request and review time off."
        description="Sign in to submit and review crew time off requests."
        icon={<CalendarClock className="w-5 h-5" />}
      />
    );
  }

  return (
    <div className="p-4">
      <TimeOffPanel />
    </div>
  );
}
