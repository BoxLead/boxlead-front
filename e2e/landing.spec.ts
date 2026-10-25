import { BILLING_ENABLED } from "../src/landing/flags.ts";
import { expect, test } from "./support.ts";

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

for (const [scheme, background] of [
  ["light", "rgb(244, 243, 236)"],
  ["dark", "rgb(10, 21, 33)"],
] as const) {
  test(`the landing follows the ${scheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
    await expect(page.locator(".landing")).toHaveCSS("background-color", background);
    await expect(page.locator("html")).toHaveCSS("color-scheme", scheme);
  });
}

test("the footer wordmark fits inside the footer", async ({ page }) => {
  await page.goto("/");
  const wordmark = page.locator(".footer-wordmark");
  await wordmark.scrollIntoViewIfNeeded();
  const fits = await page.evaluate(() => {
    const footer = document.querySelector(".landing-footer")?.getBoundingClientRect();
    const mark = document.querySelector(".footer-wordmark")?.getBoundingClientRect();
    return footer !== undefined && mark !== undefined && mark.bottom <= footer.bottom + 0.5;
  });
  expect(fits).toBe(true);
});

test("the plans section shows no amounts and leads to the register", async ({ page }) => {
  await page.goto("/");
  const plans = page.locator("#planes");
  if (!BILLING_ENABLED) {
    await expect(plans).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Planes" })).toHaveCount(0);
    return;
  }
  await plans.scrollIntoViewIfNeeded();
  await expect(plans.getByRole("heading", { name: "Elegí cómo empezar" })).toBeVisible();
  await expect(plans.getByRole("heading", { level: 3 })).toHaveText(["Beta", "Starter", "Business"]);
  await expect(plans.getByRole("link", { name: "Elegir Starter" })).toHaveAttribute("href", "/register?plan=STARTER");
  await expect(plans.getByRole("link", { name: "Elegir Business" })).toHaveAttribute("href", "/register?plan=BUSINESS");
  expect(await plans.innerText()).not.toMatch(/[\d$]/);
});
