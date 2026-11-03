import { expect, test } from "@playwright/test";

/** Creates a throwaway account (livetest+<ts>@removebgai.test); delete it from auth.users after the run. */
const EMAIL = `livetest+${Date.now()}@removebgai.test`;
const PASSWORD = "LiveTest2026!a";

test("email: sign up → menu → logout → log in again", async ({ page }) => {
  await page.goto("/auth/signup/email");
  const signup = page.getByTestId("signup-email-card");
  await signup.locator('input[type="email"]').fill(EMAIL);
  const passwords = signup.locator('input[autocomplete="new-password"]');
  await passwords.nth(0).fill(PASSWORD);
  await passwords.nth(1).fill(PASSWORD);
  await signup.locator('button[type="submit"]').click();
  await page.waitForURL(/\/menu$/, { timeout: 30_000 });

  await page.getByTestId("logout-button").first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/menu"), { timeout: 30_000 });

  await page.goto("/auth/login");
  const login = page.getByTestId("login-card");
  await login.locator('input[type="email"]').fill(EMAIL);
  await login.locator('input[type="password"]').fill(PASSWORD);
  await login.locator('button[type="submit"]').click();
  await page.waitForURL(/\/menu$/, { timeout: 30_000 });
  await expect(page.getByTestId("logout-button").first()).toBeVisible();
});
