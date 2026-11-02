import { expect, test, type Page } from "@playwright/test";

type Mode = "desktop" | "mobilePortrait" | "mobileLandscape";

const VIEWPORTS: Array<{ width: number; height: number; mode: Mode }> = [
  { width: 1440, height: 900, mode: "desktop" },
  { width: 1280, height: 800, mode: "desktop" },
  { width: 1024, height: 768, mode: "desktop" },
  { width: 390, height: 844, mode: "mobilePortrait" },
  { width: 360, height: 740, mode: "mobilePortrait" },
  { width: 412, height: 915, mode: "mobilePortrait" },
  { width: 768, height: 1024, mode: "mobilePortrait" },
  { width: 844, height: 390, mode: "mobileLandscape" },
  { width: 740, height: 360, mode: "mobileLandscape" },
  { width: 915, height: 412, mode: "mobileLandscape" },
];

const SCREENS = [
  { path: "/", name: "landing", appShell: false },
  { path: "/auth/login", name: "login", appShell: false },
  { path: "/auth/signup", name: "signup-choice", appShell: false },
  { path: "/auth/signup/email", name: "signup-email", appShell: false },
  { path: "/auth/signup/mobile", name: "signup-mobile", appShell: false },
  { path: "/auth/guest", name: "guest", appShell: false },
  { path: "/menu", name: "menu", appShell: true },
  { path: "/workspace", name: "workspace", appShell: true },
  { path: "/simulator", name: "simulator", appShell: true },
  { path: "/history", name: "history", appShell: true },
  { path: "/mypage", name: "mypage", appShell: true },
];

const LOCALES = ["ko", "en", "ja"] as const;

async function prepare(page: Page, locale: string) {
  await page.addInitScript((value) => {
    sessionStorage.setItem("introPlayed", "1");
    localStorage.setItem("locale", value);
    localStorage.setItem("homeHintSeen", "1");
  }, locale);
}

interface LayoutIssues {
  overlaps: string[];
  clipped: string[];
  offscreen: string[];
  tinyText: string[];
  pageOverflow: boolean;
}

async function collectIssues(page: Page, scopeSelector: string): Promise<LayoutIssues> {
  return page.evaluate(async (scope) => {
    const isVisible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()}:"${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}"`;
    const intersects = (ra: DOMRect, rb: DOMRect) =>
      Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 1 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 1;
    const root = document.querySelector(scope) ?? document.body;
    const topBar = document.querySelector("[data-testid=top-bar]");
    const bottomNav = document.querySelector("[data-testid=bottom-nav]");

    const interactive = [...root.querySelectorAll("a, button, input, select")]
      .filter(isVisible)
      .filter((el) => !el.hasAttribute("data-inset-control"));

    // Fixed bars are separate layers: compare controls only within the same layer.
    const layerOf = (el: Element) => (topBar?.contains(el) ? "top" : bottomNav?.contains(el) ? "bottom" : "content");
    const overlaps: string[] = [];
    for (let i = 0; i < interactive.length; i++) {
      for (let j = i + 1; j < interactive.length; j++) {
        const a = interactive[i];
        const b = interactive[j];
        if (a.contains(b) || b.contains(a) || layerOf(a) !== layerOf(b)) continue;
        if (intersects(a.getBoundingClientRect(), b.getBoundingClientRect())) overlaps.push(`${label(a)} x ${label(b)}`);
      }
    }

    // Content must never be hidden under the fixed bars at the top and at the very bottom of the page.
    const content = interactive.filter((el) => layerOf(el) === "content");
    const hiddenUnderBar = (bar: Element | null) =>
      bar && isVisible(bar)
        ? content.filter((el) => intersects(el.getBoundingClientRect(), bar.getBoundingClientRect())).map((el) => `${label(el)} under bar`)
        : [];
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(r));
    overlaps.push(...hiddenUnderBar(topBar));
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => requestAnimationFrame(r));
    overlaps.push(...hiddenUnderBar(bottomNav));
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(r));

    const clipped: string[] = [];
    const offscreen: string[] = [];
    for (const el of interactive) {
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > window.innerWidth + 1) offscreen.push(label(el));
      if (el.tagName !== "INPUT" && el.tagName !== "SELECT" && el.scrollWidth > el.clientWidth + 1) clipped.push(label(el));
    }

    const tinyText: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || !isVisible(parent)) continue;
      if (parseFloat(getComputedStyle(parent).fontSize) < 12) tinyText.push(label(parent));
    }

    return {
      overlaps,
      clipped,
      offscreen,
      tinyText,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  }, scopeSelector);
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const screen of SCREENS) {
      for (const locale of LOCALES) {
        test(`${screen.name} [${locale}]`, async ({ page }) => {
          await prepare(page, locale);
          await page.goto(screen.path);
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(450);

          await expect(page.locator("html")).toHaveAttribute("data-layout", viewport.mode);

          const issues = await collectIssues(page, "body");
          expect.soft(issues.overlaps, "overlapping controls").toEqual([]);
          expect.soft(issues.clipped, "clipped labels").toEqual([]);
          expect.soft(issues.offscreen, "controls outside viewport").toEqual([]);
          expect.soft(issues.tinyText, "text below 12px").toEqual([]);
          expect.soft(issues.pageOverflow, "horizontal page overflow").toBe(false);

          if (screen.appShell) {
            const primary = page.getByTestId("top-bar-row-primary");
            const actions = page.getByTestId("top-bar-row-actions");
            const p = (await primary.boundingBox())!;
            const a = (await actions.boundingBox())!;
            if (viewport.mode === "mobilePortrait") {
              expect(a.y, "actions must be on the 2nd row").toBeGreaterThanOrEqual(p.y + p.height - 1);
            } else {
              expect(Math.abs(a.y + a.height / 2 - (p.y + p.height / 2)), "single row").toBeLessThan(6);
            }
            await expect(page.getByTestId("language-toggle")).toBeVisible();
            await expect(page.getByTestId("home-button")).toBeVisible();
            const toggle = (await page.getByTestId("language-toggle").boundingBox())!;
            const mypage = (await page.getByTestId("mypage-button").boundingBox())!;
            const logout = (await page.getByTestId("logout-button").boundingBox())!;
            expect(toggle.x + toggle.width).toBeLessThanOrEqual(mypage.x + 1);
            expect(mypage.x + mypage.width).toBeLessThanOrEqual(logout.x + 1);
          }

          await page.screenshot({
            path: `e2e/__screenshots__/${viewport.width}x${viewport.height}/${screen.name}-${locale}.png`,
            fullPage: true,
          });
        });
      }
    }
  });
}

test("rotation switches layout profile immediately", async ({ page }) => {
  await prepare(page, "ko");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/menu");
  await expect(page.locator("html")).toHaveAttribute("data-layout", "mobilePortrait");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("html")).toHaveAttribute("data-layout", "mobileLandscape", { timeout: 300 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("html")).toHaveAttribute("data-layout", "mobilePortrait", { timeout: 300 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("html")).toHaveAttribute("data-layout", "desktop", { timeout: 300 });
});
