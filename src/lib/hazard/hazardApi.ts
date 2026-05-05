import { supabase } from "@/lib/supabase/client";

export async function getHazards() {
  const { data, error } = await supabase
    .from("hazard_zones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createHazard(hazard: {
  title: string;
  description?: string;
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high";
}) {
  const { data, error } = await supabase
    .from("hazard_zones")
    .insert(hazard)
    .select();

  if (error) throw error;
  return data[0];
}

export async function deleteHazard(id: string) {
  const { error } = await supabase
    .from("hazard_zones")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateHazard(id: string, updates: any) {
  const { data, error } = await supabase
    .from("hazard_zones")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
}
