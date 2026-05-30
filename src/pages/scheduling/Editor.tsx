"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sanitizePayload } from "@/lib/security";
import { usePermissions } from "@/hooks/usePermissions";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
type ScheduleEvent = {
  id: string;
  title: string;
  details: string | null;
  event_type: string;
  visibility: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
};

type User = {
  id: string;
  email: string;
  name?: string | null;
};

type Assignment = {
  user_id: string;
};

export default function Editor() {
  const { id } = useParams(); // For /scheduling/edit/:id
  const navigate = useNavigate();
  const { canAdmin } = usePermissions();
  const { activeOrgId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [eventType, setEventType] = useState("shift");
  const [visibility, setVisibility] = useState("public");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");

  // Assignment state
  const [users, setUsers] = useState<User[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);

  // ---------------------------------------------------------------------
  // LOAD DATA (event + assignments + user list)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!canAdmin) return;
    async function load() {
      setLoading(true);
      try {
        // Load org members (limited) for assignment list
        if (!activeOrgId) {
          setUsers([]);
          setAssigned([]);
          setLoading(false);
          return;
        }

        const { data: memberRows, error: memberError } = await supabase
          .from("organization_members")
          .select("user_id, email, member_name")
          .eq("organization_id", activeOrgId)
          .range(0, 199); // cap to 200 rows for speed

        if (memberError) {
          console.error("Error loading members:", memberError);
          toast.error("Unable to load members for assignments.");
          setUsers([]);
        } else {
          setUsers(
            (memberRows || []).map((m) => ({
              id: m.user_id,
              email: m.email || m.user_id,
              name: m.member_name || null,
            }))
          );
        }

        // If no ID => new schedule
        if (!id) {
          setLoading(false);
          return;
        }

        // Load pre-existing event
        const { data: events, error: eventError } = await supabase
          .from("schedule_events")
          .select("*")
          .eq("id", id)
          .eq("organization_id", activeOrgId)
          .limit(1);

        if (eventError) {
          console.error("Error loading event:", eventError);
          toast.error("Could not load this schedule entry.");
        } else if (events && events.length > 0) {
          const ev = events[0];
          setTitle(ev.title);
          setDetails(ev.details || "");
          setEventType(ev.event_type);
          setVisibility(ev.visibility);
          setStart(ev.start_time?.slice(0, 16)); // convert timestamp to datetime-local
          setEnd(ev.end_time ? ev.end_time.slice(0, 16) : "");
          setLocation(ev.location || "");
        }

        // Load assignments
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("schedule_assignments")
          .select("user_id")
          .eq("event_id", id);

        if (assignmentError) {
          console.error("Error loading assignments:", assignmentError);
          toast.error("Could not load assignments for this event.");
          setAssigned([]);
        } else {
          setAssigned(assignmentRows?.map((a: Assignment) => a.user_id) || []);
        }
      } catch (err) {
        console.error("Error loading schedule:", err);
        toast.error("Could not load the schedule editor.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, canAdmin, activeOrgId]);

  // ---------------------------------------------------------------------
  // ACCESS CONTROL (UI)
  // ---------------------------------------------------------------------
  if (!canAdmin) {
    return (
      <div className="p-6 space-y-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-orange-100 hover:text-white"
          onClick={() => navigate("/scheduling")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to schedule
        </button>
        <GlassCard className="p-5 space-y-2">
          <h1 className="text-xl font-semibold text-white">Admin access required</h1>
          <p className="text-sm text-orange-100/80">
            Only owners or admins can create or edit schedule entries. Ask an admin to make this change for you.
          </p>
        </GlassCard>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // SAVE EVENT
  // ---------------------------------------------------------------------
  async function saveEvent() {
    if (!title.trim() || !start.trim()) {
      alert("Title and Start Time are required.");
      return;
    }
    if (!activeOrgId) {
      alert("No active organization found. Select or create an organization first.");
      return;
    }

    setSaving(true);

    try {
      let eventId = id;

      const payload = sanitizePayload({
        title,
        details,
        event_type: eventType,
        visibility,
        organization_id: activeOrgId,
        start_time: start ? new Date(start).toISOString() : null,
        end_time: end ? new Date(end).toISOString() : null,
        location,
        created_by: (await supabase.auth.getUser()).data.user?.id || null,
      });

      // CREATE
      if (!id) {
        const { data, error } = await supabase
          .from("schedule_events")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      // UPDATE
      if (id) {
        const { error } = await supabase
          .from("schedule_events")
          .update(payload)
          .eq("id", id);

        if (error) throw error;
      }

      // SYNC ASSIGNMENTS
      await syncAssignments(eventId as string);

      alert("Schedule saved successfully.");
      navigate("/scheduling");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------
  // SYNC ASSIGNMENTS (Deletes removed users + inserts new)
  // ---------------------------------------------------------------------
  async function syncAssignments(eventId: string) {
    // Load existing assignments for comparison
    const { data: existing } = await supabase
      .from("schedule_assignments")
      .select("user_id")
      .eq("event_id", eventId);

    const existingSet = new Set(existing?.map((x: Assignment) => x.user_id) || []);
    const newSet = new Set(assigned);

    // Users to add
    const toAdd = [...newSet].filter((u) => !existingSet.has(u));
    // Users to remove
    const toRemove = [...existingSet].filter((u) => !newSet.has(u));

    // Insert new assignments
    if (toAdd.length > 0) {
      await supabase.from("schedule_assignments").insert(
        toAdd.map((userId) =>
          sanitizePayload({
            event_id: eventId,
            user_id: userId,
          })
        )
      );
    }

    // Delete removed assignments
    if (toRemove.length > 0) {
      for (const userId of toRemove) {
        await supabase
          .from("schedule_assignments")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);
      }
    }
  }

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white">
        Loading schedule...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-6 py-10 text-white">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-black/30 hover:bg-black/40 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold">
            {id ? "Edit Schedule" : "Create Schedule"}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/10">

          {/* Title */}
          <label className="text-white/90 font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
          />

          {/* Event Type */}
          <label className="text-white/90 font-medium">Event Type</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
          >
            <option value="shift">Shift</option>
            <option value="meeting">Meeting</option>
            <option value="training">Training</option>
            <option value="safety_briefing">Safety Briefing</option>
            <option value="equipment_assignment">Equipment Assignment</option>
            <option value="custom">Custom</option>
          </select>

          {/* Visibility */}
          <label className="text-white/90 font-medium">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
          >
            <option value="public">Public</option>
            <option value="crew_only">Crew Only</option>
            <option value="supervisor">Supervisor</option>
          </select>

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-white/90 font-medium">Start Time</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white/90 font-medium">End Time</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
              />
            </div>
          </div>

          {/* Location */}
          <label className="text-white/90 font-medium">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
          />

          {/* Details */}
          <label className="text-white/90 font-medium">Details</label>
          <textarea
            value={details}
            rows={5}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full mt-1 mb-6 px-3 py-2 rounded-lg bg-black/20 border border-white/20 text-white"
          />

          {/* Assignment Panel */}
          <h2 className="text-xl font-semibold mt-6 mb-3">Crew Assignments</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-white/80">{u.email}</span>
                <input
                  type="checkbox"
                  checked={assigned.includes(u.id)}
                  onChange={() => {
                    if (assigned.includes(u.id)) {
                      setAssigned(assigned.filter((x) => x !== u.id));
                    } else {
                      setAssigned([...assigned, u.id]);
                    }
                  }}
                />
              </div>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={saveEvent}
            disabled={saving}
            className="w-full mt-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold transition disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
