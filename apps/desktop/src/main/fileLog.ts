import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/** Mirrors stdout/stderr to <logs>/main.log — packaged GUI builds have no attached console. */
export function installFileLog(): string {
  const file = path.join(app.getPath("logs"), "main.log");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const stream = fs.createWriteStream(file, { flags: "w" });
  for (const target of [process.stdout, process.stderr]) {
    const write = target.write.bind(target);
    target.write = ((chunk: string | Uint8Array, ...rest: never[]) => {
      stream.write(chunk);
      try {
        return write(chunk, ...rest);
      } catch {
        return true;
      }
    }) as typeof target.write;
  }
  return file;
}
