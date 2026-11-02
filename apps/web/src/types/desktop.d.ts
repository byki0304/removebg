/** Bridge exposed by the Electron preload script (`apps/desktop/src/preload`). Absent on the web. */
interface SpritecutDesktopBridge {
  readonly isDesktop: true;
  readonly oauthRedirectUrl: string;
  openExternal(url: string): Promise<void>;
}

interface Window {
  spritecutDesktop?: SpritecutDesktopBridge;
}
