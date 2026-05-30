import { Menu, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

type Props = {
  onMenuToggle: () => void;
  showMenuToggle?: boolean;
  subtitle?: string;
};

export default function TopNav({
  onMenuToggle,
  showMenuToggle = true,
  subtitle,
}: Props) {
  const { user, signOut } = useAuth() as any;
  const navigate = useNavigate();

  const handleSignInClick = () => {
    navigate("/#signin-card");
  };

  return (
    <header
      className="
        w-full 
        fixed top-0 left-0 z-40
        bg-black/70 
        backdrop-blur-md 
        border-b border-orange-400/30
        shadow-[0_2px_10px_rgba(255,200,0,0.15)]
      "
    >
      <div className="flex items-center justify-between px-4 h-14 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Menu Button */}
          {showMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden text-orange-300 hover:text-orange-400 transition"
              aria-label="Toggle navigation"
            >
              <Menu size={26} />
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src="/wzos-logo.svg" alt="Work Zone OS logo" className="h-8 w-8" />
            <div className="leading-tight min-w-0">
              <p className="text-lg font-semibold text-orange-200 truncate">Work Zone OS</p>
              {subtitle && <p className="text-[11px] text-orange-100/75 truncate">{subtitle}</p>}
            </div>
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <Link
            to="/organization"
            className="inline-flex text-sm font-semibold text-orange-200 hover:text-white transition"
          >
            Organization
          </Link>
          {/* Profile Indicator */}
          <button
            type="button"
            onClick={user ? signOut : handleSignInClick}
            className="flex items-center gap-2 text-orange-300 hover:text-orange-200 transition focus:outline-none"
            aria-label={user ? "Sign out" : "Open sign in"}
          >
            <User size={20} />
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-orange-100/80">
                {user ? "Signed in" : "Guest"}
              </span>
              <span className="text-sm font-semibold">
                {user ? "Sign out" : "Sign in"}
              </span>
            </div>
            <span className="md:hidden text-sm font-semibold">
              {user ? "Sign out" : "Sign in"}
            </span>
          </button>
        </div>
      </div>

      {/* Glowing underline bar */}
      <div className="w-full h-[2px] bg-gradient-to-r from-orange-500 via-orange-500 to-orange-400 shadow-[0_0_8px_rgba(255,180,0,0.7)]" />
    </header>
  );
}
