import type { SidecarHandle } from "./sidecarLauncher";
import { waitForHttp } from "./processUtils";

export type EngineStatus = "ai" | "basic";

/**
 * The image pipeline runs in the bundled Next.js server (`/api/remove-bg`, sharp), which forwards
 * segmentation to the sidecar via AI_ENGINE_URL and falls back to the basic engine on failure.
 * The sidecar starts asynchronously; models download on first use.
 */
export async function waitForEngine(sidecar: SidecarHandle | null, timeoutMs = 30_000): Promise<EngineStatus> {
  if (!sidecar) return "basic";
  const alive = () => !sidecar.process || sidecar.process.exitCode === null;
  return (await waitForHttp(`${sidecar.url}/health`, timeoutMs, alive)) ? "ai" : "basic";
}
