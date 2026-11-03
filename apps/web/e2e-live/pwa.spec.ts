import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["Pixel 7"] });

test("mobile: the site is installable (manifest, icons, no installability errors)", async ({ page, request }) => {
  await page.goto("/auth/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifest = (await (await request.get("/manifest.webmanifest")).json()) as {
    name: string;
    display: string;
    icons: { src: string; purpose: string }[];
  };
  expect(manifest.name).toBe("RemoveBg AI");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }

  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});
