import { expect, test } from "@playwright/test";

/** Onboard, then edit the profile via the /profile page (updateProfile). */
test("student can edit their profile after onboarding", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Minimal onboarding.
  const name = page.getByTestId("name");
  await expect(async () => {
    await name.fill("Grace Hopper");
    await expect(name).toHaveValue("Grace Hopper", { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  await page.getByTestId("email").fill(`grace+${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Education level" }).click();
  await page.getByRole("option", { name: "Masters" }).click();
  await page.getByTestId("targetTerm").fill("Fall 2027");
  await page.getByTestId("submit").click();
  await expect(page).toHaveURL(/\/programs$/);

  // Nav shows the created name.
  await expect(page.getByTestId("nav-profile")).toHaveAttribute("title", "Grace Hopper");

  // Go to the profile edit page and change the name.
  await page.goto("/profile");
  const editName = page.getByTestId("edit-name");
  await expect(editName).toHaveValue("Grace Hopper");
  await editName.fill("Grace M. Hopper");
  await page.getByTestId("edit-submit").click();

  // Confirmation shown and the nav chip reflects the update.
  await expect(page.getByTestId("edit-saved")).toBeVisible();
  await expect(page.getByTestId("nav-profile")).toHaveAttribute("title", "Grace M. Hopper");
});
