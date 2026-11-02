// Builds the Next.js standalone server and stages it (with static assets) into apps/desktop/bundle/web.
import { execSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.resolve(desktopDir, "..", "web");
const distDir = ".next-desktop";
const standaloneDir = path.join(webDir, distDir, "standalone");
const outDir = path.join(desktopDir, "bundle", "web");

execSync("npx next build", {
  cwd: webDir,
  stdio: "inherit",
  env: { ...process.env, NEXT_STANDALONE: "1", NEXT_DIST_DIR: distDir, NEXT_PUBLIC_UI_PREVIEW: "0" },
});

if (!existsSync(path.join(standaloneDir, "apps", "web", "server.js"))) {
  throw new Error(`standalone server.js not found under ${standaloneDir}`);
}
rmSync(outDir, { recursive: true, force: true });
cpSync(standaloneDir, outDir, { recursive: true, verbatimSymlinks: false, dereference: true });
cpSync(path.join(webDir, distDir, "static"), path.join(outDir, "apps", "web", distDir, "static"), { recursive: true });
cpSync(path.join(webDir, "public"), path.join(outDir, "apps", "web", "public"), { recursive: true });

// The desktop bundle is distributed to users: never ship server secrets. NEXT_PUBLIC_* values are inlined at build time.
for (const dir of [outDir, path.join(outDir, "apps", "web")]) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".env")) rmSync(path.join(dir, name));
  }
}
console.log(`[bundle-web] staged ${outDir}`);
