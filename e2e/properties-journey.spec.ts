import { test, expect } from "@playwright/test";

/**
 * Journey 2 (per the engineering directive): Properties → Detail → Request information →
 * Successful processing.
 *
 * "Detail" here is the property card itself on the Properties listing page (properties don't
 * currently have their own dedicated detail route — see Sprint 2 notes — so "detail" is the
 * expanded card content already visible on the listing page). If a dedicated property detail
 * page is added later, this test's second step should be updated to navigate to it instead.
 */

test.describe("Properties → Request information → Successful processing", () => {
  test("filters properties and submits a real enquiry tied to a specific listing", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Exercise the category filter — a real interactive feature, not just a static list.
    await page.getByRole("button", { name: "Land", exact: true }).click();
    const cards = page.locator(".property-card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const firstCard = cards.first();
    const propertyName = await firstCard.locator("h2").innerText();

    await firstCard.getByRole("link", { name: /request information/i }).click();
    await expect(page).toHaveURL(/\/contact\?interest=.*&property=/);
    await expect(page.getByText(`Regarding: ${propertyName}`)).toBeVisible();

    await page.getByLabel("Full name").fill("Playwright Property Tester");
    await page.getByLabel("Email address").fill(`e2e-property-${Date.now()}@example.com`);
    await page.getByLabel("Phone number").fill("+2348000000001");
    await page.getByLabel("How can we help?").fill("Automated end-to-end test enquiry about this property.");
    await page.getByRole("button", { name: /send enquiry/i }).click();

    await expect(page.getByText("Enquiry received")).toBeVisible({ timeout: 10_000 });
  });

  test("shows a real empty state, not a broken page, when a filter matches nothing", async ({ page }) => {
    await page.goto("/properties");
    // Push the budget slider to its minimum, then search for something unlikely to match —
    // should land on the genuine "no exact match" empty state, not an error or blank screen.
    const slider = page.getByLabel("Maximum indicative budget");
    await slider.fill("5");
    await page.getByPlaceholder(/search by feature/i).fill("zzz-no-such-property-zzz");
    await expect(page.getByText("No exact match yet")).toBeVisible();
  });
});
