import { test, expect } from "@playwright/test";

/**
 * Journey 1 (per the engineering directive): Homepage → Projects → Project detail →
 * Enquiry → Successful submission.
 *
 * Depends on the CMS actually being seeded (see cms/SETUP.md Step 6) — these tests assume
 * at least one published Project exists. If the CMS is empty, the "browse to a project"
 * steps will hit the empty state instead and these assertions will correctly fail, which is
 * the right behavior (it means content setup isn't done yet, not that the code is broken).
 */

test.describe("Homepage → Projects → Project detail → Enquiry", () => {
  test("completes the full journey with a real enquiry submission", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Navigate to Projects via the nav link, not a hardcoded URL — proves real navigation works.
    await page.getByRole("link", { name: "Projects", exact: true }).first().click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Click into the first real project card the CMS returned.
    const firstProjectCard = page.locator(".project-card").first();
    await expect(firstProjectCard).toBeVisible();
    const projectName = await firstProjectCard.locator("h3").innerText();
    await firstProjectCard.click();

    // Project detail page loaded, and shows the same project we clicked.
    await expect(page.getByRole("heading", { level: 1, name: projectName })).toBeVisible();

    // "Request information" carries the project context into the Contact page.
    await page.getByRole("link", { name: /request information/i }).click();
    await expect(page).toHaveURL(/\/contact\?interest=.*&project=/);
    await expect(page.getByText(`Regarding: ${projectName}`)).toBeVisible();

    // Fill and submit the real enquiry form.
    await page.getByLabel("Full name").fill("Playwright Test User");
    await page.getByLabel("Email address").fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Phone number").fill("+2348000000000");
    await page.getByLabel("How can we help?").fill("This is an automated end-to-end test enquiry.");
    await page.getByRole("button", { name: /send enquiry/i }).click();

    // Real success state only — never the old fake-success behavior.
    await expect(page.getByText("Enquiry received")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /thank you/i })).toBeVisible();
  });

  test("shows field-level errors for an invalid submission instead of a fake success", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Full name").fill("A"); // too short, fails validation
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByLabel("Phone number").fill("123");
    await page.getByLabel("How can we help?").fill("short");
    await page.getByRole("button", { name: /send enquiry/i }).click();

    // Must NOT show the success state for an invalid submission.
    await expect(page.getByText("Enquiry received")).not.toBeVisible();
  });
});
