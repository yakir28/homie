// Ordered app states for the how-to reel. Each step leaves the page in the state to screenshot.
const tour = async (page) => { const skip = page.getByLabel("Skip product tour"); if (await skip.count()) await skip.click(); };
export default {
  explore: async (page) => { await tour(page); await page.mouse.move(1400, 880); },
  template: async (page) => { await tour(page); await page.locator(".template-card").first().click(); },
  picker: async (page) => { await page.getByRole("button", { name: /choose listing/i }).first().click(); },
  picked: async (page) => { await page.locator(".creation-picker").getByText("1428 Maple Crest Dr").first().click(); },
  listings: async (page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(500); await page.locator("nav, aside").getByText("My listings", { exact: true }).first().click(); await page.waitForTimeout(2000); },
  videos: async (page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(500); await page.keyboard.press("Escape"); await page.locator("nav, aside").getByText("My videos", { exact: true }).first().click(); await page.waitForTimeout(2500); },
};
