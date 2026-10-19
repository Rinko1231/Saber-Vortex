import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.SABER_URL ?? "http://127.0.0.1:5173/";
const outputDir = resolve("artifacts");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(`PAGE ERROR: ${error.message}`));

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("#game-root canvas").waitFor({ state: "visible" });
await page.screenshot({ path: resolve(outputDir, "01-title.png"), fullPage: true });

const titleVisible = await page.locator("#start-screen").isVisible();
const title = await page.locator("h1").innerText();
await page.locator("#start-button").click();
await page.waitForTimeout(700);

const canvasBox = await page.locator("#game-root canvas").boundingBox();
if (!canvasBox) throw new Error("Canvas has no bounding box");
const centerX = canvasBox.x + canvasBox.width / 2;
const centerY = canvasBox.y + canvasBox.height / 2;
const radius = Math.min(canvasBox.width, canvasBox.height) * 0.34;

const readAim = () =>
  page.evaluate(() => ({
    angle: window.__saberDev.simulation.aim.angle,
    length: window.__saberDev.simulation.aim.length,
  }));
const directionalAim = {};
for (const [name, x, y] of [
  ["right", centerX + radius, centerY],
  ["down", centerX, centerY + radius],
  ["left", centerX - radius, centerY],
  ["up", centerX, centerY - radius],
]) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(220);
  directionalAim[name] = await readAim();
}
await page.mouse.move(centerX + 34, centerY);
await page.waitForTimeout(350);
const shortBladeLength = (await readAim()).length;
await page.mouse.move(centerX + radius, centerY);
await page.waitForTimeout(500);
const longBladeLength = (await readAim()).length;
const lengthRange = { shortBladeLength, longBladeLength };

for (let lap = 0; lap < 3; lap += 1) {
  for (let step = 0; step < 48; step += 1) {
    const angle = (step / 48) * Math.PI * 2 + lap * 0.16;
    await page.mouse.move(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
  }
}
await page.waitForTimeout(1000);
await page.screenshot({ path: resolve(outputDir, "02-combat.png"), fullPage: true });
await page.screenshot({
  path: resolve(outputDir, "02-combat-close.png"),
  clip: {
    x: Math.max(0, centerX - 190),
    y: Math.max(0, centerY - 190),
    width: 380,
    height: 380,
  },
});

const combatState = await page.evaluate(() => {
  const dev = window.__saberDev;
  return dev
    ? {
        phase: dev.simulation.phase,
        time: dev.simulation.time,
        enemies: dev.simulation.enemies.length,
        hp: dev.simulation.stats.hp,
        aimLength: dev.simulation.aim.length,
        player: {
          x: dev.scene.player.x,
          y: dev.scene.player.y,
          displayWidth: dev.scene.player.displayWidth,
          displayHeight: dev.scene.player.displayHeight,
          textureWidth: dev.scene.player.texture.source[0].width,
          textureHeight: dev.scene.player.texture.source[0].height,
        },
      }
    : null;
});

const hitTest = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  sim.spawnEnemy("wisp");
  const enemy = sim.enemies.at(-1);
  enemy.x = sim.center.x + 170;
  enemy.y = sim.center.y;
  enemy.hp = 20;
  enemy.maxHp = 20;
  enemy.speed = 0;
  return { killsBefore: sim.kills, spawnedId: enemy.id };
});
await page.mouse.move(centerX + radius, centerY);
await page.waitForTimeout(900);
const hitResult = await page.evaluate(() => ({
  kills: window.__saberDev.simulation.kills,
  aimAngle: window.__saberDev.simulation.aim.angle,
  remainingEnemies: window.__saberDev.simulation.enemies.length,
}));

await page.evaluate(() => {
  const dev = window.__saberDev;
  if (dev?.simulation.phase === "running") dev.simulation.gainXp(30);
});
await page.waitForTimeout(200);
const upgradeVisible = await page.locator("#upgrade-screen").isVisible();
const upgradeCardCount = await page.locator(".upgrade-card").count();
if (upgradeVisible) {
  await page.screenshot({ path: resolve(outputDir, "03-upgrade.png"), fullPage: true });
  await page.locator(".upgrade-card").first().click();
  await page.waitForTimeout(250);
}

await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const pauseVisible = await page.locator("#pause-screen").isVisible();
if (pauseVisible) {
  await page.screenshot({ path: resolve(outputDir, "04-pause.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
}

await page.evaluate(() => {
  const dev = window.__saberDev;
  if (dev) dev.simulation.time = 84.9;
});
await page.waitForTimeout(600);
await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  if (sim.boss) {
    sim.boss.x = sim.center.x;
    sim.boss.y = 185;
  }
});
await page.waitForTimeout(100);
const bossState = await page.evaluate(() => {
  const dev = window.__saberDev;
  return dev
    ? {
        phase: dev.simulation.phase,
        bossAlive: Boolean(dev.simulation.boss),
        bossHp: dev.simulation.boss?.hp ?? 0,
        enemies: dev.simulation.enemies.length,
      }
    : null;
});
await page.screenshot({ path: resolve(outputDir, "05-boss.png"), fullPage: true });

await page.evaluate(() => {
  window.__saberDev.simulation.stats.hp = 0;
});
await page.waitForTimeout(250);
const endVisible = await page.locator("#end-screen").isVisible();
if (endVisible) {
  await page.screenshot({ path: resolve(outputDir, "06-end.png"), fullPage: true });
  await page.locator("#end-restart").click();
  await page.waitForTimeout(300);
}
const restartState = await page.evaluate(() => ({
  phase: window.__saberDev.simulation.phase,
  time: window.__saberDev.simulation.time,
  hp: window.__saberDev.simulation.stats.hp,
}));

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(outputDir, "07-mobile.png"), fullPage: true });
const rotateVisible = await page.locator("#rotate-screen").isVisible();

console.log(
  JSON.stringify(
    {
      titleVisible,
      title,
      combatState,
      directionalAim,
      lengthRange,
      hitTest,
      hitResult,
      upgradeVisible,
      upgradeCardCount,
      pauseVisible,
      bossState,
      endVisible,
      restartState,
      rotateVisible,
      consoleErrors,
    },
    null,
    2,
  ),
);

await browser.close();
