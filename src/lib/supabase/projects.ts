import type { User } from "@supabase/supabase-js";
import type { IconMeta } from "../../../types/icon";
import { getSupabaseBrowserClient } from "./client";

export interface SavedProject {
  id: string;
  user_id: string;
  name: string;
  icon_library: string;
  icon_name: string;
  icon_id: string;
  icon_data: IconMeta;
  color: string;
  sequences: unknown[];
  created_at: string;
  updated_at: string;
}

export interface SaveProjectInput {
  id?: string | null;
  user: User;
  name: string;
  icon: IconMeta;
  color: string;
  sequences: unknown[];
}

const selectColumns =
  "id,user_id,name,icon_library,icon_name,icon_id,icon_data,color,sequences,created_at,updated_at";
const MAX_PROJECT_NAME_LENGTH = 160;
const MAX_JSON_BYTES = 500_000;
const MAX_SEQUENCES = 100;

function jsonByteLength(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function projectIconId(icon: IconMeta) {
  return `${icon.library}:${icon.name}`;
}

function cleanProjectName(name: string, fallback: string) {
  const trimmed = name.trim();
  return (trimmed || fallback).slice(0, MAX_PROJECT_NAME_LENGTH);
}

function validateProjectPayload(input: SaveProjectInput) {
  if (input.sequences.length > MAX_SEQUENCES) return "Projects can contain at most 100 sequences.";
  if (jsonByteLength(input.icon) > MAX_JSON_BYTES) return "Icon data is too large to save.";
  if (jsonByteLength(input.sequences) > MAX_JSON_BYTES) return "Sequence data is too large to save.";
  return null;
}

function formatSupabaseError(message: string | undefined) {
  if (!message) return null;
  if (message.includes("saved_projects") && message.includes("schema cache")) {
    return "Supabase table is missing. Run supabase/schema.sql in the Supabase SQL editor.";
  }
  return message;
}

export async function listSavedProjects() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { projects: [] as SavedProject[], error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("saved_projects")
    .select(selectColumns)
    .order("updated_at", { ascending: false })
    .limit(24);

  return {
    projects: (data ?? []) as SavedProject[],
    error: formatSupabaseError(error?.message),
  };
}

export async function saveProject(input: SaveProjectInput) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { project: null, error: "Supabase is not configured." };
  const validationError = validateProjectPayload(input);
  if (validationError) return { project: null, error: validationError };

  const payload = {
    user_id: input.user.id,
    name: cleanProjectName(input.name, input.icon.name),
    icon_library: input.icon.library,
    icon_name: input.icon.name,
    icon_id: projectIconId(input.icon),
    icon_data: input.icon,
    color: input.color,
    sequences: input.sequences,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabase
        .from("saved_projects")
        .update(payload)
        .eq("id", input.id)
        .select(selectColumns)
        .single()
    : supabase.from("saved_projects").insert(payload).select(selectColumns).single();

  const { data, error } = await query;

  return {
    project: (data as SavedProject | null) ?? null,
    error: formatSupabaseError(error?.message),
  };
}
