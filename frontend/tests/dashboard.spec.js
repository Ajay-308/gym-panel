import { test, expect } from "@playwright/test";

test.describe("Aj gym dashboard", () => {
  test("loads title and gym selector", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Aj gym")).toBeVisible();
    await expect(page.locator("select")).toBeVisible();
  });

  test("summary KPIs render when API healthy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("All gyms — checked in now")).toBeVisible({
      timeout: 15000,
    });
  });

  test("simulator controls present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Start 1×/ })).toBeVisible({
      timeout: 15000,
    });
  });
});
