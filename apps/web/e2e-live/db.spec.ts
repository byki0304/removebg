import { expect, test, type BrowserContext } from "@playwright/test";
import sharp from "sharp";

/**
 * End-to-end DB check as a real user: sign up (profile write), process a generated JPG (jobs insert),
 * read it back (history + REST under RLS), delete it (REST under RLS) and confirm it is gone.
 * The throwaway account (livetest+<ts>@removebgai.test) must be deleted from auth.users afterwards.
 */
const SUPABASE_URL = "https://nouwdwoxibvjquiusgej.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_SmlOwzZ2SotohQo_RkN0lg_kzkO0ZXJ";
const EMAIL = `livetest+${Date.now()}@removebgai.test`;
const PASSWORD = "LiveTest2026!a";
const FILE_NAME = `db-check-${Date.now()}.jpg`;

async function accessToken(context: BrowserContext, baseURL: string): Promise<string> {
  const parts = (await context.cookies(baseURL))
    .filter((c) => c.name.startsWith("sb-nouwdwoxibvjquiusgej-auth-token") && !c.name.includes("code-verifier"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const raw = parts.map((c) => c.value).join("");
  const json = raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64url").toString("utf8") : decodeURIComponent(raw);
  return (JSON.parse(json) as { access_token: string }).access_token;
}

test("db: profile + job save, read and delete through the deployed app", async ({ page, context, request, baseURL }) => {
  await page.goto("/auth/signup/email");
  const signup = page.getByTestId("signup-email-card");
  await signup.locator('input[type="email"]').fill(EMAIL);
  const passwords = signup.locator('input[autocomplete="new-password"]');
  await passwords.nth(0).fill(PASSWORD);
  await passwords.nth(1).fill(PASSWORD);
  await signup.locator('button[type="submit"]').click();
  await page.waitForURL(/\/menu$/, { timeout: 30_000 });

  const token = await accessToken(context, baseURL!);
  const rest = (path: string, method = "GET") =>
    request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, Prefer: "return=representation" },
    });

  // Profile row was saved and is readable by its owner.
  const profiles = (await (await rest("profiles?select=account_type,email")).json()) as { account_type: string; email: string }[];
  expect(profiles).toEqual([{ account_type: "email", email: EMAIL }]);

  // Process a generated JPG -> jobs row is inserted.
  const square = await sharp({ create: { width: 80, height: 80, channels: 3, background: "#2050e0" } }).png().toBuffer();
  const jpg = await sharp({ create: { width: 320, height: 240, channels: 3, background: "#ffffff" } })
    .composite([{ input: square, left: 120, top: 80 }])
    .jpeg({ quality: 90 })
    .toBuffer();
  await page.goto("/workspace");
  await page.locator('input[type="file"]').setInputFiles({ name: FILE_NAME, mimeType: "image/jpeg", buffer: jpg });
  await page.getByTestId("start-processing").click();
  await expect(page.getByTestId("batch-queue").getByText(/완료|Done/)).toBeVisible({ timeout: 60_000 });

  // Read back: REST (RLS) and the history screen.
  type Job = { id: string; original_file_name: string; status: string };
  let jobs: Job[] = [];
  await expect
    .poll(async () => {
      jobs = (await (await rest(`jobs?select=id,original_file_name,status&original_file_name=eq.${FILE_NAME}`)).json()) as Job[];
      return jobs.length;
    })
    .toBe(1);
  expect(jobs[0].status).toBe("COMPLETED");
  await page.goto("/history");
  await expect(page.getByTestId("history-screen").getByText(FILE_NAME)).toBeVisible({ timeout: 15_000 });

  // Delete under RLS, then confirm it is gone everywhere.
  const deleted = (await (await rest(`jobs?id=eq.${jobs[0].id}`, "DELETE")).json()) as Job[];
  expect(deleted.map((j) => j.id)).toEqual([jobs[0].id]);
  expect(await (await rest(`jobs?select=id&id=eq.${jobs[0].id}`)).json()).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("history-screen")).toBeVisible();
  await expect(page.getByText(FILE_NAME)).toHaveCount(0);

  // RLS: an anonymous caller sees no jobs at all.
  const anon = await request.get(`${SUPABASE_URL}/rest/v1/jobs?select=id`, { headers: { apikey: PUBLISHABLE_KEY } });
  expect(await anon.json()).toEqual([]);

  await page.getByTestId("logout-button").first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/menu"), { timeout: 30_000 });
});
