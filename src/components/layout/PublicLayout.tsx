import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import GlobalFooter from "./GlobalFooter";
import PageNavArrows from "./PageNavArrows";
import { useLocation } from "react-router-dom";

export default function PublicLayout() {
  const location = useLocation();
  const showArrows = location.pathname !== "/";

  return (
    <div className="relative min-h-screen text-white">
      <TopNav
        onMenuToggle={() => {}}
        showMenuToggle={false}
        subtitle="Work Zone OS"
      />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
          <Outlet />
        </div>
        <GlobalFooter />
      </main>
      {showArrows && <PageNavArrows />}
    </div>
  );
}
