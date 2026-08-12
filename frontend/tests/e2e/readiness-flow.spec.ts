import { expect, test } from "@playwright/test";

/**
 * Full UI flow: onboard → pick program → generate checklist → mark an item
 * complete → readiness score updates immediately → timeline renders ordered.
 */
test("student completes the readiness flow end to end", async ({ page }) => {
  // Fresh session (no stored profile).
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  // Wait for client-side hydration to settle before typing, otherwise the very
  // first fill can be reset when Vue patches the freshly hydrated inputs.
  await page.waitForLoadState("networkidle");

  // --- Onboarding ---
  const unique = Date.now();
  const nameField = page.getByTestId("name");
  await expect(async () => {
    await nameField.fill("Ada Lovelace");
    await expect(nameField).toHaveValue("Ada Lovelace", { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await page.getByTestId("email").fill(`ada+${unique}@example.com`);

  // Education level (Headless UI Listbox). Open the trigger button, then choose
  // the option from the listbox.
  await page.getByRole("button", { name: "Education level" }).click();
  await page.getByRole("option", { name: "Bachelors" }).click();

  await page.getByTestId("gpa").fill("3.8");
  await page.getByTestId("targetTerm").fill("Fall 2027");
  await page.getByTestId("testScores").fill("SAT 1450");
  await page.getByTestId("submit").click();

  // Redirected to catalog.
  await expect(page).toHaveURL(/\/programs$/);
  await expect(page.getByTestId("program-grid")).toBeVisible();

  // --- Selection ---
  // Search narrows the catalog (debounced) to the Computer Science program.
  await page.getByTestId("program-search").fill("Computer Science");
  await expect(page.getByText("B.S. Computer Science")).toBeVisible();
  await expect(page.getByTestId("view-program")).toHaveCount(1);

  // Open its detail view by clicking through (deterministic seeded id).
  await page.getByTestId("view-program").first().click();
  await expect(page).toHaveURL(/\/programs\/prog-cs-bachelors$/);
  await expect(page.getByTestId("generate-checklist")).toBeVisible();

  // --- Generation ---
  await page.getByTestId("generate-checklist").click();
  await expect(page).toHaveURL(/\/dashboard\?program=prog-cs-bachelors$/);

  // --- Dashboard: initial score is 0% ---
  const score = page.getByTestId("score-pct");
  await expect(score).toBeVisible();
  await expect(score).toHaveText("0%");

  // Missing callout visible with items.
  await expect(page.getByTestId("missing-callout")).toBeVisible();

  // "Application" (Submit online application) is the last checklist category.
  await expect(page.getByTestId("checklist-group").last()).toHaveText("Application");

  // Timeline rendered, ordered chronologically (ascending), with the offset-0
  // "Submit online application" as the last (latest) milestone.
  const timeline = page.getByTestId("timeline");
  await expect(timeline).toBeVisible();
  const times = await timeline.locator("time").allTextContents();
  expect(times.length).toBeGreaterThan(0);
  const ms = times.map((t) => new Date(t).getTime());
  expect(ms).toEqual([...ms].sort((a, b) => a - b));
  await expect(timeline.locator("li").last()).toContainText("Submit online application");

  // --- Interaction: mark first item complete → score updates immediately ---
  const firstCheckbox = page.getByTestId("item-checkbox").first();
  await firstCheckbox.click();

  // Score should rise above 0% (authoritative refetch from API).
  await expect(score).not.toHaveText("0%", { timeout: 5000 });

  const scoreText = await score.textContent();
  expect(scoreText).not.toBe("0%");
});
