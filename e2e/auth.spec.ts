import { test, expect } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("register page renders", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Create an account")).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByText("Forgot password")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("home redirects to dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/login/);
  });
});
