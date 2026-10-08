import { test, expect } from "@playwright/test";

/**
 * Journey 3 (per the engineering directive): Services → Service detail → Contact journey.
 */

test.describe("Services → Service detail → Contact", () => {
  test("navigates from the services list into a detail page and through to contact", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const firstServiceRow = page.locator(".service-detail-row").first();
    await expect(firstServiceRow).toBeVisible();
    const serviceTitle = await firstServiceRow.locator("h2").innerText();
    await firstServiceRow.click();

    await expect(page.getByRole("heading", { level: 1, name: serviceTitle })).toBeVisible();

    await page.getByRole("link", { name: /talk to our team/i }).click();
    await expect(page).toHaveURL(/\/contact\?interest=.*&service=/);
    await expect(page.getByText(`Regarding: ${serviceTitle}`)).toBeVisible();
  });

  test("shows a real not-found state for a nonexistent service slug instead of crashing", async ({ page }) => {
    await page.goto("/services/this-service-does-not-exist");
    await expect(page.getByText("Service not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /return home/i })).toBeVisible();
  });
});
