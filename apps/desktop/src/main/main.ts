import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { waitForEngine } from "./aiBridge";
import { deepLinkToCallbackUrl, findDeepLink, registerDeepLinkProtocol } from "./deepLinkAuth";
import { installFileLog } from "./fileLog";
import { launchSidecar, type SidecarHandle } from "./sidecarLauncher";
import { startWebServer, type WebServerHandle } from "./webServer";

const isSmokeTest = process.env.SPRITECUT_SMOKE === "1";

let mainWindow: BrowserWindow | null = null;
let webServer: WebServerHandle | null = null;
let sidecar: SidecarHandle | null = null;
let pendingDeepLink: string | null = findDeepLink(process.argv);

function isAppUrl(url: string): boolean {
  return webServer !== null && new URL(url).origin === new URL(webServer.url).origin;
}

function openDeepLink(deepLink: string): void {
  if (!mainWindow || !webServer) {
    pendingDeepLink = deepLink;
    return;
  }
  const target = deepLinkToCallbackUrl(deepLink, webServer.url);
  if (target) void mainWindow.loadURL(target);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function createWindow(url: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: "#0B0C10",
    title: "SpriteCut AI",
    autoHideMenuBar: true,
    show: !isSmokeTest,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//.test(target) && !isAppUrl(target)) void shell.openExternal(target);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, target) => {
    if (!isAppUrl(target)) {
      event.preventDefault();
      if (/^https:\/\//.test(target)) void shell.openExternal(target);
    }
  });

  if (isSmokeTest) {
    win.webContents.once("did-finish-load", async () => {
      await new Promise((r) => setTimeout(r, 1500));
      const location = await win.webContents.executeJavaScript("location.pathname + ' | ' + document.title + ' | bridge=' + Boolean(window.spritecutDesktop)");
      console.log(`[smoke] loaded ${location}`);
      app.quit();
    });
  }

  void win.loadURL(`${url}/`);
  return win;
}

ipcMain.handle("spritecut:open-external", async (_event, url: unknown) => {
  if (typeof url !== "string" || !url.startsWith("https://")) throw new Error("Only https URLs can be opened.");
  await shell.openExternal(url);
});

async function bootstrap(): Promise<void> {
  sidecar = await launchSidecar();
  try {
    webServer = await startWebServer(sidecar?.url ?? null);
  } catch (error) {
    dialog.showErrorBox("SpriteCut AI", error instanceof Error ? error.message : String(error));
    app.quit();
    return;
  }
  mainWindow = createWindow(webServer.url);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (pendingDeepLink) {
    const link = pendingDeepLink;
    pendingDeepLink = null;
    mainWindow.webContents.once("did-finish-load", () => openDeepLink(link));
  }
  void waitForEngine(sidecar).then((status) => console.log(`[engine] ${status}`));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  console.log(`[main] log file: ${installFileLog()}`);
  registerDeepLinkProtocol();
  app.on("second-instance", (_event, argv) => {
    const link = findDeepLink(argv);
    if (link) openDeepLink(link);
    else mainWindow?.focus();
  });
  app.on("open-url", (event, url) => {
    event.preventDefault();
    openDeepLink(url);
  });
  app.whenReady().then(bootstrap);
  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", () => {
    webServer?.stop();
    sidecar?.stop();
  });
}
