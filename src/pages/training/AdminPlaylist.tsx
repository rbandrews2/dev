import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TrainingItem, TrainingModuleContent, TrainingRequirement, TrainingTrigger, parseTrainingContent, stringifyTrainingContent, normalizeYouTubeId } from "@/lib/training/trainingContent";
import { cdlModuleDefaultContent } from "@/data/trainingDefaults";

type DbTrainingModule = {
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  duration?: string;
  content?: unknown;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

const requirementOptions: TrainingRequirement[] = ["required", "recommended", "optional"];
const triggerOptions: TrainingTrigger[] = ["always", "before_quiz", "after_quiz", "before_exam"];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminPlaylist() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<DbTrainingModule[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [content, setContent] = useState<TrainingModuleContent>({ version: 1, items: [] });

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return modules.find((m) => (m.id ?? m.title) === selectedKey) ?? null;
  }, [modules, selectedKey]);

  const loadModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("training_modules")
        .select("id, title, category, description, duration, content");
      if (error) throw error;
      const list = (data ?? []) as DbTrainingModule[];

      // Ensure CDL module is visible for admin configuration even if DB row is missing.
      const hasCdl = list.some((m) => (m.id ?? m.title) === "cdl-prep" || m.title === "CDL Prep Test");
      if (!hasCdl) {
        list.unshift({
          id: "cdl-prep",
          title: "CDL Prep Test",
          category: "CDL",
          description: "Practice and exam mode CDL prep questions.",
          duration: "30 min",
          content: cdlModuleDefaultContent,
        });
      }

      setModules(list);
      const firstKey = selectedKey ?? (list[0]?.id ?? list[0]?.title ?? null);
      setSelectedKey(firstKey);
      const first = list.find((m) => (m.id ?? m.title) === firstKey) ?? null;
      setContent(parseTrainingContent(first?.content));
    } catch (error: unknown) {
      setError(errorMessage(error, "Failed to load modules."));
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  function setItem(id: string, patch: Partial<TrainingItem>) {
    setContent((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  }

  function moveItem(id: string, dir: -1 | 1) {
    setContent((prev) => {
      const idx = prev.items.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.items.length) return prev;
      const items = [...prev.items];
      const [removed] = items.splice(idx, 1);
      items.splice(nextIdx, 0, removed);
      return { ...prev, items };
    });
  }

  function addVideo() {
    setContent((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: uid("video"),
          type: "video",
          title: "New Video",
          requirement: "optional",
          trigger: "always",
          youtubeId: "",
        },
      ],
    }));
  }

  function addLesson() {
    setContent((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: uid("lesson"),
          type: "lesson",
          title: "New Lesson",
          requirement: "optional",
          trigger: "always",
          body: "",
        },
      ],
    }));
  }

  function removeItem(id: string) {
    setContent((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const key = selected.id ?? selected.title;
      if (!key) throw new Error("Missing module key.");

      // Normalize any YouTube ids before writing.
      const normalized: TrainingModuleContent = {
        version: 1,
        items: content.items.map((it) => {
          if (it.type === "video") {
            return {
              ...it,
              youtubeId: normalizeYouTubeId(it.youtubeId ?? ""),
            };
          }
          return it;
        }),
      };

      const payload = stringifyTrainingContent(normalized);

      // Update by id when possible; fall back to title match.
      if (selected.id) {
        const { error } = await supabase
          .from("training_modules")
          .update({ content: payload })
          .eq("id", selected.id);
        if (error) throw error;
      } else if (selected.title) {
        const { error } = await supabase
          .from("training_modules")
          .update({ content: payload })
          .eq("title", selected.title);
        if (error) throw error;
      } else {
        throw new Error("Cannot save: module has no id or title.");
      }

      await loadModules();
      setSelectedKey(key);
    } catch (error: unknown) {
      setError(
        errorMessage(
          error,
          "Save failed. Ensure the training_modules table includes a JSON/JSONB 'content' column and your RLS allows org-admin updates."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Playlist Manager</h1>
        <p className="text-gray-400 mt-2">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Playlist Manager</h1>
          <p className="text-gray-400 mt-2">
            Edit training module playlists (required vs recommended) by modifying <code>training_modules.content</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadModules} disabled={loading || saving}>
            Refresh
          </Button>
          <Button onClick={save} disabled={loading || saving || !selected}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-red-200">{error}</CardContent>
        </Card>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Module</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Select
            value={selectedKey ?? undefined}
            onValueChange={(v) => {
              setSelectedKey(v);
              const mod = modules.find((m) => (m.id ?? m.title) === v) ?? null;
              setContent(parseTrainingContent(mod?.content));
            }}
          >
            <SelectTrigger className="w-full sm:w-[360px] bg-black/20 border-white/10">
              <SelectValue placeholder="Choose a module" />
            </SelectTrigger>
            <SelectContent>
              {modules.map((m) => {
                const k = m.id ?? m.title ?? "";
                if (!k) return null;
                return (
                  <SelectItem key={k} value={k}>
                    {m.title ?? m.id}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selected?.category && <Badge variant="secondary">{selected.category}</Badge>}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Playlist Items</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={addLesson} disabled={!selected}>
                Add Lesson
              </Button>
              <Button variant="secondary" onClick={addVideo} disabled={!selected}>
                Add Video
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.items.length === 0 ? (
            <p className="text-gray-400">No items configured yet.</p>
          ) : (
            content.items.map((it) => (
              <div key={it.id} className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Badge variant="secondary">{it.type}</Badge>
                    <Input
                      value={it.title}
                      onChange={(e) => setItem(it.id, { title: e.target.value })}
                      className="bg-black/20 border-white/10"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={it.requirement}
                      onValueChange={(v) => setItem(it.id, { requirement: v as TrainingRequirement })}
                    >
                      <SelectTrigger className="w-[170px] bg-black/20 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {requirementOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={it.trigger}
                      onValueChange={(v) => setItem(it.id, { trigger: v as TrainingTrigger })}
                    >
                      <SelectTrigger className="w-[170px] bg-black/20 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerOptions.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="secondary" onClick={() => moveItem(it.id, -1)}>
                      Up
                    </Button>
                    <Button variant="secondary" onClick={() => moveItem(it.id, 1)}>
                      Down
                    </Button>
                    <Button variant="destructive" onClick={() => removeItem(it.id)}>
                      Remove
                    </Button>
                  </div>
                </div>

                {it.type === "video" && (
                  <div className="grid gap-2">
                    <label className="text-sm text-gray-300">YouTube URL or Video ID</label>
                    <Input
                      value={it.youtubeId ?? ""}
                      onChange={(e) => setItem(it.id, { youtubeId: e.target.value })}
                      placeholder="https://youtu.be/… or 11-char id"
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                )}

                {it.type === "lesson" && (
                  <div className="grid gap-2">
                    <label className="text-sm text-gray-300">Lesson Body</label>
                    <Textarea
                      value={it.body ?? ""}
                      onChange={(e) => setItem(it.id, { body: e.target.value })}
                      className="bg-black/20 border-white/10 min-h-[120px]"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
