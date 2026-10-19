import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const previewUrl = process.env.SABER_URL ?? "http://127.0.0.1:5173/";
const baseUrl = `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}nopointerlock=1`;
const lockUrl = previewUrl;
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

const openRoster = async () => {
  await page.locator("#start-button").click();
  await page.locator("#character-screen").waitFor({ state: "visible" });
};

const startCharacter = async (id) => {
  await openRoster();
  await page.locator(`[data-character-id="${id}"]`).click();
  await page.locator("#character-start").click();
  await page.waitForTimeout(450);
};

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("#game-root canvas").waitFor({ state: "visible" });
await page.screenshot({ path: resolve(outputDir, "01-title.png"), fullPage: true });
const titleVisible = await page.locator("#start-screen").isVisible();

await openRoster();
const rosterCount = await page.locator(".character-card").count();
const rosterText = await page.locator("#character-detail").innerText();
await page.screenshot({ path: resolve(outputDir, "02-roster.png"), fullPage: true });

await page.locator("#character-start").click();
await page.waitForTimeout(700);
const canvasBox = await page.locator("#game-root canvas").boundingBox();
if (!canvasBox) throw new Error("Canvas has no bounding box");

const gameState = await page.evaluate(() => {
  const dev = window.__saberDev;
  return dev
    ? {
        phase: dev.simulation.phase,
        characterId: dev.simulation.characterId,
        weapon: dev.simulation.character.weaponKind,
        center: dev.simulation.center,
        width: dev.simulation.width,
        height: dev.simulation.height,
        pointerLocked: dev.scene.pointerLocked,
      }
    : null;
});

const toScreen = (x, y) => ({
  x: canvasBox.x + (x / gameState.width) * canvasBox.width,
  y: canvasBox.y + (y / gameState.height) * canvasBox.height,
});

const moveTo = async (x, y) => {
  const point = toScreen(x, y);
  await page.mouse.move(point.x, point.y);
};

const directionalAim = {};
const center = gameState.center;
for (const [name, dx, dy] of [
  ["right", 190, 0],
  ["down", 0, 190],
  ["left", -190, 0],
  ["up", 0, -190],
]) {
  await moveTo(center.x + dx, center.y + dy);
  await page.waitForTimeout(220);
  directionalAim[name] = await page.evaluate(() => ({
    angle: window.__saberDev.simulation.aim.angle,
    length: window.__saberDev.simulation.aim.length,
  }));
}
await moveTo(center.x + 34, center.y);
await page.waitForTimeout(350);
const shortBladeLength = await page.evaluate(() => window.__saberDev.simulation.aim.length);
await moveTo(center.x + 190, center.y);
await page.waitForTimeout(500);
const longBladeLength = await page.evaluate(() => window.__saberDev.simulation.aim.length);
const halfTurnStep = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  sim.aim.angle = 0;
  sim.aim.previousAngle = 0;
  sim.update(0.016, sim.center.x - 220, sim.center.y);
  const result = {
    resultingAngle: sim.aim.angle,
    maxExpectedTurn: sim.stats.turnSpeed * 0.016,
  };
  sim.aim.angle = 0;
  sim.aim.previousAngle = 0;
  sim.aim.angularSpeed = 0;
  sim.aim.angularVelocity = 0;
  sim.aim.radialSpeed = 0;
  return result;
});

await moveTo(center.x + 170, center.y);
await page.waitForTimeout(450);
await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  sim.spawnEnemy("wisp");
  const enemy = sim.enemies.at(-1);
  enemy.x = sim.center.x + 170;
  enemy.y = sim.center.y;
  enemy.hp = 220;
  enemy.maxHp = 220;
  enemy.speed = 0;
});
await page.waitForTimeout(750);
const stationaryContact = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  const enemy = sim.enemies.find((item) => item.maxHp === 220);
  return { kills: sim.kills, damagedHp: enemy ? enemy.hp : 220 };
});

await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  const enemy = sim.enemies.find((item) => item.maxHp === 220);
  if (enemy) {
    enemy.hp = 20;
    enemy.maxHp = 20;
  }
});
for (let step = 0; step < 42; step += 1) {
  const angle = (step / 42) * Math.PI * 2;
  await moveTo(center.x + Math.cos(angle) * 180, center.y + Math.sin(angle) * 180);
}
await page.waitForTimeout(500);
const movingHit = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  return {
    kills: sim.kills,
    qiProjectiles: sim.projectiles.filter((projectile) => projectile.kind === "qi").length,
    angularSpeed: sim.aim.angularSpeed,
  };
});
await page.screenshot({ path: resolve(outputDir, "03-constella-combat.png"), fullPage: true });

await page.evaluate(() => window.__saberDev.simulation.gainXp(30));
await page.waitForTimeout(220);
const upgradeVisible = await page.locator("#upgrade-screen").isVisible();
const upgradeCardCount = await page.locator(".upgrade-card").count();
const upgradeScopes = await page.locator(".upgrade-scope").allTextContents();
if (upgradeVisible) {
  await page.screenshot({ path: resolve(outputDir, "04-upgrade.png"), fullPage: true });
  await page.locator(".upgrade-card").first().click();
  await page.waitForTimeout(220);
}

await page.keyboard.press("Space");
await page.waitForTimeout(120);
const skillState = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  return {
    cooldown: sim.skillCooldownRemaining,
    active: sim.skillActiveRemaining,
    name: sim.character.skillName,
  };
});

await page.keyboard.press("Escape");
await page.waitForTimeout(220);
const pauseVisible = await page.locator("#pause-screen").isVisible();
if (pauseVisible) await page.screenshot({ path: resolve(outputDir, "05-pause.png"), fullPage: true });

const characterBoots = [];
const mechanics = {};
for (const id of ["moxibai", "yeqingyu", "lucoco", "araman", "beitangxue"]) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await startCharacter(id);
  const boot = await page.evaluate(() => {
    const sim = window.__saberDev.simulation;
    return { id: sim.characterId, weapon: sim.character.weaponKind, phase: sim.phase };
  });
  characterBoots.push(boot);

  if (id === "moxibai") {
    await moveTo(center.x + 120, center.y);
    await page.waitForTimeout(180);
    mechanics.moxibai = await page.evaluate(() => ({
      primary: window.__saberDev.simulation.aim.length,
      secondary: window.__saberDev.simulation.runtime.secondaryLength,
    }));
  } else if (id === "yeqingyu") {
    await page.waitForTimeout(2300);
    mechanics.yeqingyu = await page.evaluate(() => ({
      talismans: window.__saberDev.simulation.projectiles.filter((projectile) => projectile.kind === "talisman").length,
    }));
  } else if (id === "lucoco") {
    await page.waitForTimeout(300);
    mechanics.lucoco = await page.evaluate(() => ({
      satellites: window.__saberDev.simulation.stats.satelliteCount,
      orbit: window.__saberDev.simulation.runtime.orbitPhase,
    }));
  } else if (id === "araman") {
    await page.evaluate(() => {
      const sim = window.__saberDev.simulation;
      sim.spawnEnemy("brute");
      const enemy = sim.enemies.at(-1);
      enemy.x = sim.center.x + 170;
      enemy.y = sim.center.y;
      enemy.hp = 900;
      enemy.maxHp = 900;
      enemy.speed = 0;
    });
    for (let index = 0; index < 5; index += 1) {
      await moveTo(center.x + 90, center.y);
      await page.waitForTimeout(70);
      await moveTo(center.x + 300, center.y);
      await page.waitForTimeout(70);
    }
    mechanics.araman = await page.evaluate(() => ({
      thrustChain: window.__saberDev.simulation.runtime.thrustChain,
      slashCoefficient: window.__saberDev.simulation.stats.slashCoefficient,
      thrustCoefficient: window.__saberDev.simulation.stats.thrustCoefficient,
    }));
    await page.screenshot({ path: resolve(outputDir, "06-araman.png"), fullPage: true });
  } else if (id === "beitangxue") {
    await page.evaluate(() => {
      const sim = window.__saberDev.simulation;
      sim.spawnEnemy("brute");
      const enemy = sim.enemies.at(-1);
      enemy.x = sim.center.x + 180;
      enemy.y = sim.center.y;
      enemy.hp = 900;
      enemy.maxHp = 900;
      enemy.speed = 0;
      sim.aim.angle = 0;
      sim.aim.previousAngle = 0;
      sim.aim.length = sim.stats.maxBlade;
      sim.activateSkill();
    });
    await moveTo(center.x + 220, center.y);
    await page.waitForTimeout(220);
    mechanics.beitangxue = await page.evaluate(() => ({
      cooldown: window.__saberDev.simulation.skillCooldownRemaining,
      parryBudget: window.__saberDev.simulation.parryChainBudget,
      knockedEnemies: window.__saberDev.simulation.enemies.filter((enemy) => enemy.parryTimer > 0).length,
    }));
    await page.screenshot({ path: resolve(outputDir, "07-beitang-parry.png"), fullPage: true });
  }
}

await page.goto(baseUrl, { waitUntil: "networkidle" });
await startCharacter("constella");
const specialEnemyTest = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  const beforeBrood = sim.enemies.length;
  sim.spawnEnemyAt("wisp", sim.center.x + 210, sim.center.y, ["brood"]);
  const brood = sim.enemies.at(-1);
  brood.age = 1;
  brood.hp = 1;
  sim.damageEnemy(brood, 99);
  const afterBrood = sim.enemies.length;

  const hpBefore = sim.stats.hp;
  sim.spawnEnemyAt("brute", sim.center.x + 70, sim.center.y, ["volatile"]);
  const volatileEnemy = sim.enemies.at(-1);
  volatileEnemy.hp = 1;
  sim.damageEnemy(volatileEnemy, 999);
  const hpAfter = sim.stats.hp;

  sim.spawnEnemyAt("brute", sim.center.x + 270, sim.center.y - 70, ["slash_weak"]);
  const slashWeak = sim.enemies.at(-1);
  sim.spawnEnemyAt("brute", sim.center.x + 270, sim.center.y + 70, ["thrust_weak"]);
  const thrustWeak = sim.enemies.at(-1);
  sim.spawnEnemyAt("runner", sim.center.x - 240, sim.center.y + 120, ["side_armor"]);
  const sideArmor = sim.enemies.at(-1);
  sim.spawnEnemyAt("wisp", sim.center.x + 170, sim.center.y, ["blade_slow"]);
  const bladeSlow = sim.enemies.at(-1);
  return {
    broodSpawned: afterBrood - beforeBrood,
    volatilePlayerDamage: hpBefore - hpAfter,
    slashVulnerability: slashWeak.slashVulnerability,
    thrustVulnerability: thrustWeak.thrustVulnerability,
    sideArmorGuardAngle: sideArmor.guardAngle,
    bladeSlowModifier: bladeSlow.modifiers[0],
  };
});
await moveTo(center.x + 170, center.y);
await page.waitForTimeout(260);
specialEnemyTest.weaponSlowTimer = await page.evaluate(
  () => window.__saberDev.simulation.weaponSlowTimer,
);
await page.screenshot({ path: resolve(outputDir, "08-special-enemies.png"), fullPage: true });

await page.evaluate(() => {
  window.__saberDev.simulation.time = 84.9;
});
await page.waitForTimeout(450);
const bossTest = await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  const boss = sim.boss;
  return { spawned: Boolean(boss), hp: boss?.hp ?? 0 };
});
await page.evaluate(() => {
  const sim = window.__saberDev.simulation;
  if (sim.boss) sim.damageEnemy(sim.boss, 99999, "skill");
});
await page.waitForTimeout(250);
const victoryVisible = await page.locator("#end-screen").isVisible();
if (victoryVisible) await page.screenshot({ path: resolve(outputDir, "09-victory.png"), fullPage: true });

await page.evaluate(() => localStorage.setItem("saber-display-mode", "portrait"));
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl, { waitUntil: "networkidle" });
await startCharacter("lucoco");
const portraitState = await page.evaluate(() => {
  const canvas = document.querySelector("#game-root canvas");
  const rect = canvas?.getBoundingClientRect();
  return {
    bodyClass: document.body.className,
    rotateExists: Boolean(document.querySelector("#rotate-screen")),
    canvasRatio: rect ? rect.width / rect.height : 0,
    phase: window.__saberDev.simulation.phase,
  };
});
await page.screenshot({ path: resolve(outputDir, "10-portrait.png"), fullPage: true });

await page.evaluate(() => localStorage.setItem("saber-display-mode", "landscape"));
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(lockUrl, { waitUntil: "networkidle" });
await startCharacter("constella");
const pointerLockState = await page.evaluate(() => ({
  locked: window.__saberDev.scene.pointerLocked,
  pointerLockElement: Boolean(document.pointerLockElement),
}));

console.log(
  JSON.stringify(
    {
      titleVisible,
      rosterCount,
      rosterHasSkill: rosterText.includes("主动技能"),
      gameState,
      directionalAim,
      lengthRange: { shortBladeLength, longBladeLength },
      halfTurnStep,
      stationaryContact,
      movingHit,
      upgradeVisible,
      upgradeCardCount,
      upgradeScopes,
      skillState,
      pauseVisible,
      characterBoots,
      mechanics,
      specialEnemyTest,
      bossTest,
      victoryVisible,
      portraitState,
      pointerLockState,
      consoleErrors,
    },
    null,
    2,
  ),
);

await browser.close();
