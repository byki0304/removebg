import { app } from "electron";
import path from "node:path";

export const DEEP_LINK_SCHEME = "spritecut";
export const OAUTH_REDIRECT_URL = `${DEEP_LINK_SCHEME}://auth/callback`;

/** Fixed so the session cookie (scoped to 127.0.0.1:port) survives app restarts. */
export const DEFAULT_WEB_PORT = Number(process.env.SPRITECUT_WEB_PORT || 39217);
/** In development the web dev server reads AI_ENGINE_URL=http://127.0.0.1:8000 from its .env.local. */
export const DEFAULT_ENGINE_PORT = Number(process.env.SPRITECUT_ENGINE_PORT || (app.isPackaged ? 39218 : 8000));

/** Hosted web deployment that performs admin-only auth steps (the desktop build has no service key). */
export const CLOUD_URL = process.env.SPRITECUT_CLOUD_URL || "";

export function resourcePath(...segments: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, ...segments)
    : path.join(__dirname, "..", "..", ...segments);
}
