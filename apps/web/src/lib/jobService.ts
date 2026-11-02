"use client";

import type { JobOptions, JobRecord, Profile } from "@spritecut/shared";
import { getSupabaseBrowser } from "./supabase/client";

export async function recordJob(profile: Profile | null, fileName: string, options: JobOptions, succeeded: boolean) {
  const supabase = getSupabaseBrowser();
  if (!supabase || !profile) return;
  await supabase.from("jobs").insert({
    user_id: profile.id,
    is_guest: profile.account_type === "guest",
    original_file_name: fileName,
    status: succeeded ? "COMPLETED" : "FAILED",
    options,
  });
}

export async function fetchJobs(): Promise<JobRecord[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return [];
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as JobRecord[] | null) ?? [];
}
