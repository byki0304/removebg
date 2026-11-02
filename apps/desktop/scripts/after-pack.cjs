// electron-builder drops node_modules from extraResources, but the Next.js standalone server needs them.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const resourcesDir =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  const source = path.join(__dirname, "..", "bundle", "web");
  if (!fs.existsSync(path.join(source, "apps", "web", "server.js"))) {
    throw new Error("bundle/web is missing — run `npm run bundle:web` first.");
  }
  const target = path.join(resourcesDir, "web");
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
};
