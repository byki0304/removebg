import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { CLOUD_URL, DEFAULT_WEB_PORT, resourcePath } from "./config";
import { killTree, pickPort, spawnLogged, waitForHttp } from "./processUtils";

export interface WebServerHandle {
  url: string;
  stop(): void;
}

/**
 * Packaged: runs the Next.js standalone server with Electron's own Node runtime.
 * Development: uses REMOVEBG_WEB_URL or the `npm run dev` server on :3000.
 */
export async function startWebServer(engineUrl: string | null): Promise<WebServerHandle> {
  if (!app.isPackaged) {
    const url = process.env.REMOVEBG_WEB_URL || "http://localhost:3000";
    if (!(await waitForHttp(url, 60_000))) {
      throw new Error(`Web dev server not reachable at ${url}. Run "npm run dev" at the repo root first.`);
    }
    return { url, stop: () => undefined };
  }

  const serverJs = resourcePath("web", "apps", "web", "server.js");
  if (!fs.existsSync(serverJs)) throw new Error(`Bundled web server missing: ${serverJs}`);
  const port = await pickPort(DEFAULT_WEB_PORT);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    REMOVEBG_CLOUD_URL: CLOUD_URL,
  };
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  if (engineUrl) env.AI_ENGINE_URL = engineUrl;
  else delete env.AI_ENGINE_URL;

  const child: ChildProcess = spawnLogged("web", process.execPath, [serverJs], { cwd: path.dirname(serverJs), env });
  const url = `http://127.0.0.1:${port}`;
  if (!(await waitForHttp(url, 60_000, () => child.exitCode === null))) {
    killTree(child);
    throw new Error("Bundled web server failed to start.");
  }
  return { url, stop: () => killTree(child) };
}
