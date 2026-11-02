import type { LayoutMode } from "./layoutModes";

export interface HudProfile {
  topBar: { height: number; rows: 1 | 2; fontSize: number };
  nav: "leftSidebar" | "bottomNav";
  rightPanel: boolean;
  bottomNav: { height: number } | null;
  touchTarget: number;
  authCardMaxWidth: number;
  menuGridCols: number;
  homeBubblePlacement: "left" | "bottom";
  showNavLabels: boolean;
}

export const hudConfig: Record<LayoutMode, HudProfile> = {
  desktop: {
    topBar: { height: 64, rows: 1, fontSize: 15 },
    nav: "leftSidebar",
    rightPanel: true,
    bottomNav: null,
    touchTarget: 36,
    authCardMaxWidth: 440,
    menuGridCols: 4,
    homeBubblePlacement: "left",
    showNavLabels: true,
  },
  mobilePortrait: {
    topBar: { height: 108, rows: 2, fontSize: 14 },
    nav: "bottomNav",
    rightPanel: false,
    bottomNav: { height: 64 },
    touchTarget: 44,
    authCardMaxWidth: 480,
    menuGridCols: 1,
    homeBubblePlacement: "bottom",
    showNavLabels: true,
  },
  mobileLandscape: {
    topBar: { height: 52, rows: 1, fontSize: 13 },
    nav: "bottomNav",
    rightPanel: false,
    bottomNav: { height: 56 },
    touchTarget: 40,
    authCardMaxWidth: 520,
    menuGridCols: 2,
    homeBubblePlacement: "bottom",
    showNavLabels: true,
  },
};
