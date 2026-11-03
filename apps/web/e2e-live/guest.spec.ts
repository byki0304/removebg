import { expect, test } from "@playwright/test";

/** Uses a unique nickname per run; the guest auth user is removed by the 72h cleanup (or manually). */
const NICKNAME = `LiveTest${Date.now().toString().slice(-6)}`;

test("guest: start with nickname → menu → logout releases the nickname", async ({ page, request }) => {
  const availability = async () =>
    (await (await request.get(`/api/auth/guest?nickname=${NICKNAME}`)).json()) as { available: boolean };

  expect((await availability()).available).toBe(true);

  await page.goto("/auth/guest");
  await page.locator('input[autocomplete="nickname"]').fill(NICKNAME);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/menu$/, { timeout: 30_000 });
  await expect(page.getByText(NICKNAME).first()).toBeVisible();

  expect((await availability()).available, "nickname is reserved while the guest is logged in").toBe(false);

  // Same nickname from a second browser is rejected while the first guest is active.
  const other = await page.context().browser()!.newPage();
  await other.goto("/auth/guest");
  await other.locator('input[autocomplete="nickname"]').fill(NICKNAME);
  await other.locator('button[type="submit"]').click();
  await expect(other).toHaveURL(/\/auth\/guest$/);
  await expect(other.locator('[role="alert"], .text-vivid-magenta').first()).toBeVisible();
  await other.close();

  await page.getByTestId("logout-button").first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/menu"), { timeout: 30_000 });
  await expect.poll(async () => (await availability()).available, { message: "nickname released after logout" }).toBe(true);

  await page.goto("/menu");
  await expect(page).toHaveURL(/\/auth\/login$/);
});
