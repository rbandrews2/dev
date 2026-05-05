import { Clock, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import TimeTrackingPanel from "@/components/time/TimeTrackingPanel";
import SignInRequiredCard from "@/components/time/SignInRequiredCard";

export default function TimeClockPage() {
  const { user, loading } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        Loading authentication…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-amber-400/40 bg-black/60 flex items-center justify-center text-amber-300">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Time Clock</h1>
          <p className="text-sm text-amber-100/75">
            Secure crew time tracking
          </p>
        </div>
      </div>

      {/* Auth Gate */}
      {!user ? (
        <SignInRequiredCard />
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* WORKING TIME CLOCK MODULE */}
          <TimeTrackingPanel />
        </>
      )}
    </div>
  );
}
