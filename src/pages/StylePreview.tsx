export default function StylePreview() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="glass-surface rounded-2xl border border-amber-500/30 px-6 py-10 text-center max-w-xl mx-auto">
        <img src="/wzos-logo.svg" alt="Work Zone OS" className="h-12 w-12 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-white mb-2">Style Preview</h1>
        <p className="text-sm text-amber-100/80">
          Demo-safe placeholder. Full preview is available upon activation.
        </p>
      </div>
    </div>
  );
}
