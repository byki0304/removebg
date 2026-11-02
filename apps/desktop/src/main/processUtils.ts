import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import net from "node:net";

export async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

export async function pickPort(preferred: number): Promise<number> {
  if (await isPortFree(preferred)) return preferred;
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : preferred;
      server.close(() => resolve(port));
    });
  });
}

export async function waitForHttp(url: string, timeoutMs: number, isAlive: () => boolean = () => true): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && isAlive()) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export function spawnLogged(tag: string, command: string, args: string[], options: SpawnOptions): ChildProcess {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  child.stdout?.on("data", (d: Buffer) => process.stdout.write(`[${tag}] ${d}`));
  child.stderr?.on("data", (d: Buffer) => process.stderr.write(`[${tag}] ${d}`));
  child.on("exit", (code) => console.log(`[${tag}] exited with code ${code}`));
  return child;
}

export function killTree(child: ChildProcess | null): void {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}
