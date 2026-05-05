import type { ComponentType } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  FileText,
  MessageSquare,
  GraduationCap,
  CalendarClock,
  Clock,
  Clipboard,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

type NavItem = {
  label: string;
  to?: string;
  icon: ComponentType<{ className?: string }>;
  inactiveMessage?: string;
  adminOnly?: boolean;
};

const baseNavItems: NavItem[] = [
  { label: "Admin Dashboard", to: "/admin", icon: LayoutDashboard, adminOnly: true },
  { label: "Time Clock", to: "/timeclock", icon: Clock },
  { label: "Work Orders", to: "/work-orders", icon: Clipboard },
  { label: "Navigation", to: "/navigation", icon: Map },
  { label: "Forms", to: "/forms", icon: FileText },
  { label: "Messages", to: "/messages", icon: MessageSquare },
  { label: "Training", to: "/training", icon: GraduationCap },
  { label: "Scheduling", to: "/scheduling", icon: CalendarClock },
];

type Props = {
  mobileOpen?: boolean;
  closeMobile?: () => void;
};

export default function NavigationSidebar({ mobileOpen, closeMobile }: Props) {
  const location = useLocation();
  const { canAdmin } = usePermissions();
  const navItems = baseNavItems.filter((item) => !item.adminOnly || canAdmin);

  const content = (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-lg border-r border-amber-500/20 shadow-glow">
      <div className="px-5 py-4 border-b border-amber-500/20">
        <Link to="/" className="flex items-center gap-3">
          <img src="/wzos-logo.svg" alt="Work Zone OS" className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold text-amber-200">Work Zone OS</p>
            <p className="text-xs text-amber-100/70">Field ops + safety</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {navItems.map((item) => {
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : item.to && location.pathname.startsWith(item.to);
          const Icon = item.icon;

          if (!item.to) {
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-black/50 px-3 py-2 text-sm text-amber-200/70"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[11px] text-amber-300/70">
                  {item.inactiveMessage || "Available upon activation"}
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobile}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition border ${
                active
                  ? "bg-amber-500/15 border-amber-400/50 text-amber-100 shadow-glow"
                  : "bg-black/40 border-amber-500/10 text-amber-100/80 hover:border-amber-400/40 hover:text-amber-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block fixed top-0 left-0 w-64 h-full z-30">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 h-full">{content}</div>
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeMobile} />
        </div>
      )}
    </>
  );
}
