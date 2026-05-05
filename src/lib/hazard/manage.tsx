import { useEffect, useState } from "react";
import { getHazards, deleteHazard, updateHazard } from "@/lib/hazard/hazardApi";
import HazardMapPanel from "@/components/map/HazardMapPanel";

type Hazard = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
};

export default function HazardManager() {
  const [hazards, setHazards] = useState<Hazard[]>([]);

  async function load() {
    const hz = await getHazards();
    setHazards(hz);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-yellow-400 mb-4">
        Hazard Manager
      </h1>

      <HazardMapPanel />

      <div className="mt-6 bg-black/30 p-4 rounded-xl backdrop-blur-md border border-yellow-400/30">
        <h2 className="font-semibold text-yellow-300 mb-2">Active Hazards</h2>

        <table className="w-full text-sm">
          <thead className="text-yellow-400">
            <tr>
              <th className="text-left">Title</th>
              <th>Severity</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {hazards.map((h) => (
              <tr key={h.id} className="border-b border-yellow-400/10">
                <td>{h.title}</td>
                <td>{h.severity}</td>
                <td className="flex gap-2">
                  <button
                    onClick={async () => {
                      const newSeverity = prompt(
                        "New severity? low / medium / high",
                        h.severity
                      );
                      if (!newSeverity) return;

                      await updateHazard(h.id, {
                        severity: newSeverity === "medium" || newSeverity === "high" ? newSeverity : "low",
                      });
                      load();
                    }}
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    Update
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm("Remove this hazard?")) return;
                      await deleteHazard(h.id);
                      load();
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
