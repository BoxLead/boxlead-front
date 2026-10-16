import { expect, test } from "@playwright/test";

test("the landing shows the demo video and starts it on request", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Producto" }).getByRole("link", { name: "Demo" }).click();
  const demo = page.locator("#demo");
  await expect(demo.getByRole("heading", { name: "Mirá a BoxLead en acción" })).toBeVisible();
  const video = demo.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  await demo.getByRole("button", { name: /Ver la demo/ }).click();
  await expect(video).toHaveAttribute("controls", "");
  await expect(demo.getByRole("button", { name: /Ver la demo/ })).toHaveCount(0);
});
