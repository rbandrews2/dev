import { Suspense, lazy, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import NavigationSidebar from "@/app/NavigationSidebar";
import GlobalFooter from "./GlobalFooter";
import PageNavArrows from "./PageNavArrows";

const GlobalAssistant = lazy(() => import("@/components/assistant/GlobalAssistant"));

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative w-full min-h-screen text-white overflow-x-hidden">
      {/* Top Navigation */}
      <TopNav
        onMenuToggle={() => setMobileOpen(!mobileOpen)}
        subtitle="Operations, safety, and navigation"
      />

      {/* Sidebar */}
      <NavigationSidebar
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />

      {/* Main Content */}
      <main
        key={location.pathname}
        className="
          relative pt-16 md:pl-72
          min-h-screen
          flex flex-col
          transition-opacity duration-300
          animate-fadeIn
        "
      >
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex-1 w-full">
          <Outlet />
        </div>
        <GlobalFooter />
      </main>
      <PageNavArrows />
      <Suspense fallback={null}>
        <GlobalAssistant />
      </Suspense>

    </div>
  );
}
