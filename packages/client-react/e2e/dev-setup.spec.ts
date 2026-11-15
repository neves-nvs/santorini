import { expect, test } from "@playwright/test";

test.describe("Local development setup", () => {
  test("registers a user through the UI and stays logged in after a reload", async ({ page }) => {
    const username = `smoke-${Date.now()}`;

    await page.goto("/auth");
    await page.getByRole("button", { name: /need an account\? register/i }).click();
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill("smoke-password");
    await page.getByRole("button", { name: "Register", exact: true }).click();

    await expect(page).toHaveURL(/\/lobby/);

    await page.reload();

    await expect(page).toHaveURL(/\/lobby/);
  });
});
