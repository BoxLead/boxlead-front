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

test("the demo video keeps the whole frame in full screen", async ({ page }) => {
  await page.goto("/#demo");
  await page.getByRole("button", { name: /Ver la demo/ }).click();
  const video = page.locator("#demo video");
  await video.evaluate((element) => element.requestFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("VIDEO");
  await expect(video).toHaveCSS("object-fit", "contain");
});
