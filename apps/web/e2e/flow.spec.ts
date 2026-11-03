import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.use({ viewport: { width: 1280, height: 800 } });

test("intro plays first, then landing, then login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/intro$/);
  await expect(page.getByTestId("intro-screen")).toBeVisible();
  await page.getByTestId("intro-skip").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("start-button")).toBeVisible();
  await expect(page.getByTestId("language-pills").getByRole("radio")).toHaveText(["한국어", "English", "日本語"]);
});

test("intro auto-advances after 6 seconds", async ({ page }) => {
  await page.goto("/intro");
  await expect(page).toHaveURL(/\/$/, { timeout: 9000 });
});

test("landing language pills switch the UI language", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("introPlayed", "1"));
  await page.goto("/");
  await expect(page.getByTestId("start-button")).toHaveText("시작하기");
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByTestId("start-button")).toHaveText("Get Started");
  await page.getByRole("radio", { name: "日本語" }).click();
  await expect(page.getByTestId("start-button")).toHaveText("はじめる");
});

test("login -> signup choice shows exactly two options, home button returns to landing", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("introPlayed", "1"));
  await page.goto("/auth/login");
  const card = page.getByTestId("login-card");
  await expect(card.getByTestId("home-button")).toBeVisible();
  await expect(card.getByRole("tooltip")).toHaveText("처음으로 돌아가기");
  await page.getByTestId("signup-link").click();
  await expect(page).toHaveURL(/\/auth\/signup$/);
  const choiceCard = page.getByTestId("signup-choice-card");
  await expect(choiceCard.locator("input")).toHaveCount(0);
  await expect(page.getByTestId("signup-email-choice")).toBeVisible();
  await expect(page.getByTestId("signup-mobile-choice")).toBeVisible();
  await page.getByTestId("signup-mobile-choice").click();
  const mobile = page.getByTestId("mobile-number-input").locator("input");
  await expect(mobile.nth(0)).toHaveValue("+82");
  await expect(mobile.nth(1)).toHaveAttribute("placeholder", "10 1234 5678");
  await page.getByTestId("signup-mobile-card").getByTestId("home-button").click();
  await expect(page).toHaveURL(/\/$/);
});

test("app screens all have the home button, language toggle, my page and logout", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("introPlayed", "1"));
  for (const path of ["/menu", "/workspace", "/simulator", "/history", "/mypage"]) {
    await page.goto(path);
    await expect(page.getByTestId("home-button")).toBeVisible();
    await expect(page.getByTestId("language-toggle").getByRole("radio")).toHaveText(["Ko", "En", "Ja"]);
    await expect(page.getByTestId("mypage-button")).toBeVisible();
    await expect(page.getByTestId("logout-button")).toBeVisible();
  }
});

test("background removal runs end-to-end with the built-in engine", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("introPlayed", "1"));
  await page.goto("/workspace");
  const square = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#c81e3c" } }).png().toBuffer();
  const png = await sharp({ create: { width: 96, height: 96, channels: 3, background: "#ffffff" } })
    .composite([{ input: square, left: 36, top: 36 }])
    .png()
    .toBuffer();
  await page.locator('input[type="file"]').setInputFiles({ name: "hero.png", mimeType: "image/png", buffer: png });
  await page.getByTestId("start-processing").click();
  await expect(page.getByTestId("batch-queue").getByText(/완료|Done/)).toBeVisible({ timeout: 20_000 });
});

test("oversized images are shrunk in the browser to fit the hosted upload limit", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("introPlayed", "1"));
  await page.goto("/workspace");

  const size = 2000;
  const noise = Buffer.alloc(size * size * 4);
  let seed = 1;
  for (let i = 0; i < noise.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise[i] = seed >>> 24;
  }
  for (let i = 3; i < noise.length; i += 4) noise[i] = 200;
  const png = await sharp(noise, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
  expect(png.length).toBeGreaterThan(4.5 * 1024 * 1024);

  let uploadBytes = 0;
  let uploadName = "";
  const tiny = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#00000000" } }).png().toBuffer();
  await page.route("**/api/remove-bg", async (route) => {
    const body = route.request().postDataBuffer() ?? Buffer.alloc(0);
    uploadBytes = body.length;
    uploadName = /filename="([^"]+)"/.exec(body.subarray(0, 2048).toString("latin1"))?.[1] ?? "";
    await route.fulfill({ status: 200, contentType: "image/png", body: tiny, headers: { "X-Engine": "basic" } });
  });

  await page.locator('input[type="file"]').setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: png });
  await page.getByTestId("start-processing").click();
  const queue = page.getByTestId("batch-queue");
  await expect(queue.getByText(/\uC644\uB8CC|Done/)).toBeVisible({ timeout: 60_000 });
  await expect(queue.getByText(/\uC6A9\uB7C9 \uC81C\uD55C\uC73C\uB85C \uCD95\uC18C\uB428/)).toBeVisible();
  expect(uploadBytes).toBeGreaterThan(0);
  expect(uploadBytes).toBeLessThan(4.5 * 1024 * 1024);
  expect(uploadName).toMatch(/^huge\.(png|webp)$/);
});
