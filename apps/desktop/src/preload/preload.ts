import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("spritecutDesktop", {
  isDesktop: true,
  oauthRedirectUrl: "spritecut://auth/callback",
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("spritecut:open-external", url),
});
