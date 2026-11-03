import type { TranslationKey } from "@removebg/shared";
import { NextResponse } from "next/server";

export function apiError(status: number, errorKey: TranslationKey) {
  return NextResponse.json({ errorKey }, { status });
}

export function apiOk<T extends object>(data: T = {} as T) {
  return NextResponse.json(data, { status: 200 });
}

export function isDuplicateUserError(message: string | undefined): boolean {
  return !!message && /already|registered|exists/i.test(message);
}
