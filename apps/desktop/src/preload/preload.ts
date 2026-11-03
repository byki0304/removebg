import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("removebgDesktop", {
  isDesktop: true,
  oauthRedirectUrl: "removebgai://auth/callback",
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("removebg:open-external", url),
});
