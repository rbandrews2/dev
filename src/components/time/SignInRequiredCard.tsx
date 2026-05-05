import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function SignInRequiredCard() {
  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/timeclock",
      },
    });
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-black/60 p-6 text-center space-y-4">
      <div className="mx-auto h-12 w-12 rounded-xl border border-amber-400/40 flex items-center justify-center text-amber-300">
        <LogIn className="h-5 w-5" />
      </div>

      <h2 className="text-xl font-semibold text-white">
        Sign in required
      </h2>

      <p className="text-sm text-amber-100/75">
        You must be signed in to clock in or out.
      </p>

      <Button onClick={handleSignIn} className="gap-2">
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    </div>
  );
}
