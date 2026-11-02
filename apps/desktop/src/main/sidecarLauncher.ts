import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { DEFAULT_ENGINE_PORT, resourcePath } from "./config";
import { killTree, pickPort, spawnLogged } from "./processUtils";

export interface SidecarHandle {
  url: string;
  process: ChildProcess | null;
  stop(): void;
}

interface LaunchCommand {
  command: string;
  args: string[];
  cwd: string;
}

/**
 * Packaged: PyInstaller build in resources/sidecar. Development: the venv in python_sidecar/.venv
 * (override with SPRITECUT_PYTHON). Returns null when no Python runtime is available — the web
 * server then uses its built-in basic engine.
 */
function resolveCommand(port: number): LaunchCommand | null {
  const portArgs = ["--host", "127.0.0.1", "--port", String(port), "--preload"];
  if (app.isPackaged) {
    const exe = resourcePath("sidecar", process.platform === "win32" ? "spritecut-sidecar.exe" : "spritecut-sidecar");
    return fs.existsSync(exe) ? { command: exe, args: portArgs, cwd: path.dirname(exe) } : null;
  }
  const sidecarDir = resourcePath("python_sidecar");
  const venvPython =
    process.platform === "win32"
      ? path.join(sidecarDir, ".venv", "Scripts", "python.exe")
      : path.join(sidecarDir, ".venv", "bin", "python");
  const python = process.env.SPRITECUT_PYTHON || (fs.existsSync(venvPython) ? venvPython : null);
  return python ? { command: python, args: ["sidecar_server.py", ...portArgs], cwd: sidecarDir } : null;
}

export async function launchSidecar(): Promise<SidecarHandle | null> {
  if (process.env.SPRITECUT_ENGINE_URL) {
    return { url: process.env.SPRITECUT_ENGINE_URL, process: null, stop: () => undefined };
  }
  const port = await pickPort(DEFAULT_ENGINE_PORT);
  const cmd = resolveCommand(port);
  if (!cmd) {
    console.warn("[sidecar] Python AI engine not found; using the basic engine.");
    return null;
  }
  const child = spawnLogged("sidecar", cmd.command, cmd.args, {
    cwd: cmd.cwd,
    env: { ...process.env, SPRITECUT_MODELS_DIR: path.join(app.getPath("userData"), "models") },
  });
  return { url: `http://127.0.0.1:${port}`, process: child, stop: () => killTree(child) };
}
