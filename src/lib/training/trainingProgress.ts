import { supabase } from "@/lib/supabase";
import { sanitizePayload } from "@/lib/security";

type ProgressRecord = {
  moduleId: string;
  itemId: string;
  completed: boolean;
  completedAt?: string;
};

const LS_KEY = "wzos_training_item_progress_v1";

function loadLocal(): Record<string, ProgressRecord> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // ignore
  }
  return {};
}

function saveLocal(map: Record<string, ProgressRecord>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function key(moduleId: string, itemId: string) {
  return `${moduleId}:${itemId}`;
}

export function isItemCompleted(moduleId: string, itemId: string): boolean {
  const map = loadLocal();
  return Boolean(map[key(moduleId, itemId)]?.completed);
}

export async function markItemCompleted(
  userId: string | undefined,
  moduleId: string,
  itemId: string
): Promise<void> {
  const map = loadLocal();
  map[key(moduleId, itemId)] = {
    moduleId,
    itemId,
    completed: true,
    completedAt: new Date().toISOString(),
  };
  saveLocal(map);

  // Best-effort write to Supabase if the table/columns exist.
  if (!userId) return;

  try {
    // Common patterns:
    // - training_progress(user_id, module_id, item_id, completed_at)
    // - training_progress(user_id, module_key, item_key, status)
    await supabase.from("training_progress").upsert(
      sanitizePayload({
        user_id: userId,
        module_id: moduleId,
        item_id: itemId,
        completed_at: new Date().toISOString(),
      }) as any,
      { onConflict: "user_id,module_id,item_id" } as any
    );
  } catch {
    // ignore - local progress remains authoritative in the UI
  }
}

export async function hasCompletedModuleItem(
  userId: string | undefined,
  moduleId: string,
  itemId: string
): Promise<boolean> {
  // First: local
  if (isItemCompleted(moduleId, itemId)) return true;

  // Optional: try Supabase read
  if (!userId) return false;
  try {
    const { data } = await supabase
      .from("training_progress")
      .select("completed_at, completed")
      .eq("user_id", userId)
      .eq("module_id", moduleId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (!data) return false;
    if ((data as any).completed === true) return true;
    if ((data as any).completed_at) return true;
  } catch {
    // ignore
  }
  return false;
}
