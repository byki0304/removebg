import { expect, test } from "@playwright/test";

const SUPABASE_URL = "https://nouwdwoxibvjquiusgej.supabase.co";
const SUPABASE_CALLBACK = `${SUPABASE_URL}/auth/v1/callback`;

test("Google button starts Supabase OAuth with PKCE and lands on Google sign-in", async ({ page, context, baseURL }) => {
  let authorizeUrl: URL | null = null;
  page.on("request", (req) => {
    if (req.url().startsWith(`${SUPABASE_URL}/auth/v1/authorize`)) authorizeUrl = new URL(req.url());
  });

  await page.goto("/auth/login");
  await page.getByTestId("google-login-button").click();
  await page.waitForURL(/accounts\.google\.com/, { timeout: 30_000 });

  // App side: Supabase authorize request with PKCE, returning to our callback.
  expect(authorizeUrl, "Supabase /authorize was called").not.toBeNull();
  const authorize = authorizeUrl as unknown as URL;
  expect(authorize.searchParams.get("provider")).toBe("google");
  expect(authorize.searchParams.get("redirect_to")).toBe(`${baseURL}/auth/callback`);
  expect(authorize.searchParams.get("code_challenge_method")).toBe("s256");
  const cookies = await context.cookies(baseURL!);
  expect(cookies.some((c) => c.name.endsWith("-auth-token-code-verifier")), "PKCE verifier cookie stored").toBe(true);

  // Google side: the OAuth client must accept Supabase's callback URL.
  const googleUrl = page.url();
  expect(googleUrl).toContain(".apps.googleusercontent.com");
  expect(
    googleUrl.includes("/signin/oauth/error"),
    `Google rejected the request (likely redirect_uri_mismatch). Add ${SUPABASE_CALLBACK} to the OAuth client's Authorized redirect URIs in Google Cloud Console.`,
  ).toBe(false);
});

test("callback with an invalid code returns to the login screen", async ({ page }) => {
  await page.goto("/auth/callback?code=invalid-code-123");
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("protected screens require a session", async ({ page }) => {
  await page.goto("/menu");
  await expect(page).toHaveURL(/\/auth\/login$/);
});
