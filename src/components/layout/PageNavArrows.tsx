import { ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function PageNavArrows() {
  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const state = (window.history.state as { idx?: number }) ?? {};
    const idx = typeof state.idx === "number" ? state.idx : 0;
    const length = window.history.length ?? 0;
    setCanGoBack(idx > 0);
    setCanGoForward(idx < length - 1);
  }, [location.key]);

  const handleBack = () => {
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      navigate(1);
    } else {
      navigate("/");
    }
  };

  // Do not render on landing page
  if (location.pathname === "/") return null;

  return (
    <div className="fixed inset-x-0 bottom-20 sm:bottom-10 z-20 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="pointer-events-auto rounded-full bg-black/60 border border-orange-500/40 text-orange-100 shadow-glow p-2 hover:bg-black/50 transition focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Go back"
          disabled={!canGoBack}
        >
          <ArrowLeftCircle className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={handleForward}
          className="pointer-events-auto rounded-full bg-black/60 border border-orange-500/40 text-orange-100 shadow-glow p-2 hover:bg-black/50 transition focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Go forward"
          disabled={!canGoForward}
        >
          <ArrowRightCircle className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
