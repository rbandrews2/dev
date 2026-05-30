import { useState } from "react";

type DrawerProps = {
  steps?: Array<{
    instruction: string;
    distance?: string;
    duration?: string;
  }>;
  offlineDistance?: number; // meters
  offline?: boolean;
};

export default function BottomDrawer({
  steps = [],
  offline = false,
  offlineDistance,
}: DrawerProps) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={`
        absolute left-0 right-0 bottom-0
        backdrop-blur-md
        bg-black/70
        border-t border-orange-400/20
        shadow-[0_-4px_25px_rgba(255,200,50,0.15)]
        text-orange-200
        transition-transform duration-300 ease-out
        ${open ? "translate-y-0" : "translate-y-[80%]"}
      `}
      style={{ height: "35vh" }}
    >
      {/* Drawer Handle */}
      <div className="flex justify-center py-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="w-14 h-2 rounded-full bg-orange-400/80" />
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(35vh-40px)] px-4 pb-5 space-y-4">
        <h2 className="text-lg font-semibold">
          {offline ? "Navigation (Offline)" : "Turn-by-Turn Directions"}
        </h2>

        {/* OFFLINE MODE VIEW */}
        {offline && offlineDistance !== undefined && (
          <div className="p-4 bg-black/40 border border-orange-400/20 rounded-lg">
            <p className="font-semibold">Follow the line on the map.</p>
            <p className="opacity-80 mt-1">
              Distance to destination:{" "}
              <span className="font-bold text-orange-300">
                {(offlineDistance / 1000).toFixed(2)} km
              </span>
            </p>
            <p className="opacity-80">
              Bearing updates in real-time as you move.
            </p>
          </div>
        )}

        {/* ONLINE MODE VIEW */}
        {!offline &&
          steps.map((step, i) => (
            <div
              key={i}
              className="p-4 bg-black/40 border border-orange-400/20 rounded-lg"
            >
              <div
                className="font-semibold text-orange-300"
                dangerouslySetInnerHTML={{ __html: step.instruction }}
              />
              <div className="text-sm opacity-80 mt-1">
                {step.distance} • {step.duration}
              </div>
            </div>
          ))}

        {/* EMPTY STATE */}
        {!offline && steps.length === 0 && (
          <p className="opacity-70">Awaiting navigation route…</p>
        )}
      </div>
    </div>
  );
}
