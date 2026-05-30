export default function DashboardPlaceholder() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="glass-surface rounded-2xl border border-orange-500/30 px-6 py-10 text-center max-w-xl mx-auto">
        <img src="/wzos-logo.svg" alt="Work Zone OS" className="h-12 w-12 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-white mb-2">Dashboard</h1>
        <p className="text-sm text-orange-100/80">
          Available upon activation. Core dashboard widgets are locked for this demo build.
        </p>
      </div>
    </div>
  );
}
