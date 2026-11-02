export type LayoutMode = "desktop" | "mobilePortrait" | "mobileLandscape";

export const DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP_MIN_HEIGHT = 560;

export function resolveLayoutMode(width: number, height: number): LayoutMode {
  if (width >= DESKTOP_MIN_WIDTH && height >= DESKTOP_MIN_HEIGHT) return "desktop";
  return width > height ? "mobileLandscape" : "mobilePortrait";
}

/**
 * Runs in <head> before first paint so the correct layout profile is applied
 * without a flash. Must stay in sync with resolveLayoutMode.
 */
export const LAYOUT_BOOTSTRAP_SCRIPT = `(function(){try{var w=window.innerWidth,h=window.innerHeight;var m=(w>=${DESKTOP_MIN_WIDTH}&&h>=${DESKTOP_MIN_HEIGHT})?"desktop":(w>h?"mobileLandscape":"mobilePortrait");document.documentElement.setAttribute("data-layout",m);var l=localStorage.getItem("locale");if(l==="ko"||l==="en"||l==="ja"){document.documentElement.lang=l;}}catch(e){}})();`;
