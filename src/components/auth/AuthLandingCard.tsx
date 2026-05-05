import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type AuthMode = "signin" | "signup";

interface AuthLandingCardProps {
  title?: string;
  subtitle?: string;
}

const AuthLandingCard: React.FC<AuthLandingCardProps> = ({
  title = "Sign in or create your account",
  subtitle = "Use the same login for DVIR, time clock, messaging, and training.",
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loadingAuth, signOut } = useAuth() as any;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (error) {
          setError(error.message);
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (error) {
          setError(error.message);
        } else {
          setAuthMode("signin");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-black/40 border border-amber-500/30 rounded-xl p-5 text-white">
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <p className="text-sm text-gray-400 mb-4">{subtitle}</p>

      {loadingAuth && (
        <div className="text-sm text-amber-100/80">Checking sign-in status…</div>
      )}

      {!loadingAuth && user && (
        <div className="flex items-center justify-between bg-black/60 border border-emerald-500/30 rounded-lg px-3 py-2 mb-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-emerald-200 font-semibold">Signed in</p>
            <p className="text-amber-100/70">{user.email}</p>
          </div>
          <Button
            type="button"
            onClick={signOut}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs px-3"
          >
            Sign out
          </Button>
        </div>
      )}

      {!loadingAuth && !user && (
        <>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-black/70 p-1 text-[11px] mb-4">
            <button
              type="button"
              onClick={() => setAuthMode("signin")}
              className={`px-3 py-1 rounded-full ${
                authMode === "signin"
                  ? "bg-amber-500 text-black font-semibold"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`px-3 py-1 rounded-full ${
                authMode === "signup"
                  ? "bg-amber-500 text-black font-semibold"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="w-full rounded-md bg-black/80 border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-300 mb-1">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-md bg-black/80 border border-gray-700 text-sm"
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/40 rounded px-2 py-1">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 text-black text-sm px-5"
              >
                {loading
                  ? authMode === "signin"
                    ? "Signing in..."
                    : "Creating..."
                  : authMode === "signin"
                  ? "Sign in"
                  : "Create account"}
              </Button>
            </div>
          </form>

          <div className="text-[11px] text-gray-400 mt-3 space-y-1">
            <p>
              Admins can use their main company email to configure teams, jobs,
              hazards, and time tracking. Crew members can sign in with their own
              email.
            </p>
          </div>
        </>
      )}
    </Card>
  );
};

export default AuthLandingCard;
