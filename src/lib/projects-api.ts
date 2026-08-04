// Client-side data layer for projects/rooms/briefs/inspo/generations.
// Uses the browser Supabase client; RLS scopes every read/write to the
// signed-in user automatically.

import { supabase } from "@/integrations/supabase/client";
import type { ImageAspects } from "@/lib/store";

const BUCKET = "studio-syn";
const SIGNED_TTL = 60 * 60; // 1 hour

export type Project = {
  id: string;
  user_id: string;
  name: string;
  master_palette: string[];
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  project_id: string;
  name: string;
  room_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type InspoRow = {
  id: string;
  room_id: string;
  image_url: string;
  tags: Partial<ImageAspects> & { status?: string };
  created_at: string;
};

export type BriefRow = {
  id: string;
  room_id: string;
  palette: string[];
  materials: string[];
  furniture_style: string;
  vibe: string;
  updated_at: string;
};

export type GenerationRow = {
  id: string;
  room_id: string;
  result_image_url: string;
  prompt_used: string;
  created_at: string;
};

// --- Projects --------------------------------------------------------------

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Project;
}

export async function createProject(name: string): Promise<Project> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, user_id: user.user.id, master_palette: [] })
    .select("*")
    .single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "master_palette">>,
): Promise<void> {
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// --- Rooms -----------------------------------------------------------------

export async function listRooms(projectId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Room[]) ?? [];
}

export async function createRoom(projectId: string, name: string): Promise<Room> {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ project_id: projectId, name })
    .select("*")
    .single();
  if (error) throw error;
  return data as Room;
}

export async function updateRoom(
  id: string,
  patch: Partial<Pick<Room, "name" | "room_photo_url">>,
): Promise<void> {
  const { error } = await supabase.from("rooms").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw error;
}

// --- Brief -----------------------------------------------------------------

export async function getBrief(roomId: string): Promise<BriefRow | null> {
  const { data, error } = await supabase
    .from("aesthetic_briefs")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();
  if (error) throw error;
  return (data as BriefRow) ?? null;
}

export async function upsertBrief(
  roomId: string,
  brief: {
    palette: string[];
    materials: string[];
    furniture_style: string;
    vibe: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from("aesthetic_briefs")
    .upsert({ room_id: roomId, ...brief }, { onConflict: "room_id" });
  if (error) throw error;
}

// --- Inspo -----------------------------------------------------------------

export async function listInspo(roomId: string): Promise<InspoRow[]> {
  const { data, error } = await supabase
    .from("inspiration_images")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as InspoRow[]) ?? [];
}

export async function insertInspo(
  roomId: string,
  imageUrl: string,
  tags: Partial<ImageAspects> & { status?: string },
): Promise<InspoRow> {
  const { data, error } = await supabase
    .from("inspiration_images")
    .insert({ room_id: roomId, image_url: imageUrl, tags })
    .select("*")
    .single();
  if (error) throw error;
  return data as InspoRow;
}

export async function updateInspoTags(
  id: string,
  tags: Partial<ImageAspects> & { status?: string },
): Promise<void> {
  const { error } = await supabase.from("inspiration_images").update({ tags }).eq("id", id);
  if (error) throw error;
}

export async function deleteInspo(id: string): Promise<void> {
  const { error } = await supabase.from("inspiration_images").delete().eq("id", id);
  if (error) throw error;
}

// --- Generations -----------------------------------------------------------

export async function listGenerations(roomId: string): Promise<GenerationRow[]> {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as GenerationRow[]) ?? [];
}

export async function insertGeneration(
  roomId: string,
  resultUrl: string,
  prompt: string,
): Promise<GenerationRow> {
  const { data, error } = await supabase
    .from("generations")
    .insert({ room_id: roomId, result_image_url: resultUrl, prompt_used: prompt })
    .select("*")
    .single();
  if (error) throw error;
  return data as GenerationRow;
}

export async function deleteGeneration(id: string): Promise<void> {
  const { error } = await supabase.from("generations").delete().eq("id", id);
  if (error) throw error;
}

// --- Storage ---------------------------------------------------------------

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export async function uploadDataUrl(
  folder: "rooms" | "inspo" | "generations",
  dataUrl: string,
): Promise<string> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const path = `${user.user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeStorage(path: string): Promise<void> {
  await supabase.storage
    .from(BUCKET)
    .remove([path])
    .catch(() => {});
}
