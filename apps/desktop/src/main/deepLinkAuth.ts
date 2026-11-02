import { app } from "electron";
import path from "node:path";
import { DEEP_LINK_SCHEME } from "./config";

export function registerDeepLinkProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
  }
}

export function findDeepLink(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`)) ?? null;
}

/**
 * `spritecut://auth/callback?code=…` → the local web server's OAuth callback. Only the
 * authorization code is forwarded; the PKCE verifier lives in this app's cookie jar.
 */
export function deepLinkToCallbackUrl(deepLink: string, webUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(deepLink);
  } catch {
    return null;
  }
  if (parsed.protocol !== `${DEEP_LINK_SCHEME}:` || parsed.hostname !== "auth" || parsed.pathname !== "/callback") return null;
  const code = parsed.searchParams.get("code");
  if (!code || !/^[\w-]{8,256}$/.test(code)) return `${webUrl}/auth/login`;
  return `${webUrl}/auth/callback?code=${encodeURIComponent(code)}`;
}
