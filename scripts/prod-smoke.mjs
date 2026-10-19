import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(`PAGE ERROR: ${error.message}`));

await page.goto("http://127.0.0.1:4173/?nopointerlock=1", { waitUntil: "networkidle" });
const canvas = page.locator("#game-root canvas");
await canvas.waitFor({ state: "visible" });
await page.locator("#start-button").click();
await page.locator('[data-character-id="constella"]').click();
await page.locator("#character-start").click();
await page.waitForTimeout(900);
const box = await canvas.boundingBox();
if (!box) throw new Error("Production canvas has no bounds");
await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.42);
await page.waitForTimeout(350);
await page.screenshot({ path: "artifacts/10-production.png" });
const state = {
  hudVisible: await page.locator("#hud").isVisible(),
  timer: await page.locator("#timer").innerText(),
  canvasVisible: await canvas.isVisible(),
  errors,
};
console.log(JSON.stringify(state, null, 2));
await browser.close();
