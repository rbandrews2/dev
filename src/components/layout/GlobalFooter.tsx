import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "License Agreement", href: "/license-agreement" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Contact", href: "/contact" },
];

export default function GlobalFooter() {
  return (
    <footer className="mt-10 border-t border-orange-500/20 bg-black/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/wzos-logo.svg" alt="Work Zone OS" className="h-8 w-8" />
            <div>
              <p className="text-sm font-semibold text-orange-200">Work Zone OS</p>
            </div>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-orange-100/80">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="px-3 py-1 rounded-full border border-orange-500/30 bg-black/40 hover:border-orange-400/60 transition"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
