"use client";

const zoomUrl =
  import.meta.env.VITE_ZOOM_EMBED_URL ??
  "https://zoom.us/wc/join/{MEETING_ID}"; // replace with your embed URL

export default function ZoomPage() {
  return (
    <main className="fixed inset-0 z-40 bg-black">
      {/* Optional: small floating back button that doesn't eat vertical space */}
      <a
        href="/dashboard"
        className="absolute top-3 left-3 z-50 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm border border-white/10"
      >
        ← Back
      </a>

      <div className="w-full h-full overflow-hidden">
        <iframe
          src={zoomUrl}
          className="w-full h-full border-0"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
        />
      </div>
    </main>
  );
}
