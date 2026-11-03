"use client";

import type { JobOptions, JobRecord } from "@removebg/shared";
import { getSupabaseBrowser } from "./supabase/client";

/** Resolves the user from the live session (not the possibly still-loading profile) so no job is dropped. */
export async function recordJob(fileName: string, options: JobOptions, succeeded: boolean) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  const { error } = await supabase.from("jobs").insert({
    user_id: user.id,
    is_guest: user.is_anonymous === true,
    original_file_name: fileName,
    status: succeeded ? "COMPLETED" : "FAILED",
    options,
  });
  if (error) console.error("[jobs] insert failed:", error.message);
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
