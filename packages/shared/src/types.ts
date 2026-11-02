import type { Locale } from "./i18n";

export type AccountType = "email" | "mobile" | "google" | "guest";

export interface Profile {
  id: string;
  account_type: AccountType;
  email: string | null;
  mobile_country_code: string | null;
  mobile_national: string | null;
  mobile_e164: string | null;
  nickname: string | null;
  preferred_locale: Locale;
  guest_session_active: boolean;
  guest_expires_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface JobOptions {
  autoTrim: boolean;
  padding: number;
  defringing: boolean;
  outputFormat: "png" | "webp";
  aiMode: "ultra" | "standard" | "pixel";
}

export interface JobRecord {
  id: string;
  user_id: string;
  is_guest: boolean;
  original_file_name: string;
  original_file_url: string | null;
  result_file_url: string | null;
  status: JobStatus;
  options: JobOptions;
  created_at: string;
  file_expires_at: string;
}

export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".gif"] as const;
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const MAX_GIF_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_FILES = 30;
export const MAX_BATCH_BYTES = 200 * 1024 * 1024;
export const MAX_DIMENSION = 4096;
export const FILE_TTL_HOURS = 72;

export function isAcceptedFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function maxBytesFor(fileName: string): number {
  return fileName.toLowerCase().endsWith(".gif") ? MAX_GIF_BYTES : MAX_IMAGE_BYTES;
}
