import { expect, test } from "@playwright/test";

/**
 * Stretch features: multiple programs + comparison, counselor notes, reminders.
 */
test("student uses multiple programs, counselor notes, and reminders", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Onboard (retry first fill to beat hydration).
  const name = page.getByTestId("name");
  await expect(async () => {
    await name.fill("Ada Lovelace");
    await expect(name).toHaveValue("Ada Lovelace", { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await page.getByTestId("email").fill(`ada+${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Education level" }).click();
  await page.getByRole("option", { name: "Bachelors" }).click();
  await page.getByTestId("targetTerm").fill("Fall 2027");
  await page.getByTestId("submit").click();
  await expect(page).toHaveURL(/\/programs$/);

  // Generate checklist for program #1 (Computer Science).
  await page.goto("/programs/prog-cs-bachelors");
  await page.getByTestId("generate-checklist").click();
  await expect(page).toHaveURL(/\/dashboard\?program=prog-cs-bachelors$/);

  // --- Counselor notes: reveal notes, type a counselor note, confirm it persists ---
  await page.getByRole("button", { name: "Toggle notes" }).first().click();
  const counselor = page.getByTestId("item-counselor-notes").first();
  await counselor.fill("Focus on this first.");
  await counselor.blur();
  // Reload the dashboard for this program → the note should still be there.
  await page.goto("/dashboard?program=prog-cs-bachelors");
  await expect(page.getByTestId("item-counselor-notes").first()).toHaveValue(
    "Focus on this first.",
  );

  // Generate checklist for program #2 (Data Science).
  await page.goto("/programs/prog-ds-masters");
  await page.getByTestId("generate-checklist").click();
  await expect(page).toHaveURL(/\/dashboard\?program=prog-ds-masters$/);

  // --- Multiple programs comparison ---
  await page.getByRole("link", { name: "My Programs" }).click();
  await expect(page).toHaveURL(/\/my-programs$/);
  await expect(page.getByTestId("comparison-row")).toHaveCount(2);

  // --- Reminders page loads across programs ---
  await page.getByRole("link", { name: "Reminders" }).click();
  await expect(page).toHaveURL(/\/reminders$/);
  await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible();
  // Widen the window so future-dated seed items surface, then expect the list.
  await page.getByRole("button", { name: "Reminder window" }).click();
  await page.getByRole("option", { name: "Next year" }).click();
  await expect(page.getByTestId("reminders-list")).toBeVisible();
});
