import Phaser from "phaser";
import { SaberSimulation, type EffectEvent, type Enemy } from "../game/simulation";
import type { UI } from "../ui/UI";

const WIDTH = 1280;
const HEIGHT = 720;
const TAU = Math.PI * 2;

interface EnemyView {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

interface OrbView {
  image: Phaser.GameObjects.Image;
}

interface BladeAfterimage {
  angle: number;
  length: number;
  bornAt: number;
}

export class GameScene extends Phaser.Scene {
  private ui!: UI;
  private simulation!: SaberSimulation;
  private player!: Phaser.GameObjects.Image;
  private playerAura!: Phaser.GameObjects.Image;
  private playerRings!: Phaser.GameObjects.Container;
  private sigil!: Phaser.GameObjects.Graphics;
  private vortexLayer!: Phaser.GameObjects.Container;
  private swordGlow!: Phaser.GameObjects.Graphics;
  private swordBlade!: Phaser.GameObjects.Graphics;
  private swordTrail!: Phaser.GameObjects.Graphics;
  private swordReticle!: Phaser.GameObjects.Graphics;
  private enemyViews = new Map<number, EnemyView>();
  private orbViews = new Map<number, OrbView>();
  private afterimages: BladeAfterimage[] = [];
  private pointerTarget = new Phaser.Math.Vector2(WIDTH / 2, HEIGHT / 2 - 190);
  private playerHurtFlash = 0;
  private lastPhase = "menu";

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.ui = this.registry.get("ui") as UI;
    this.simulation = new SaberSimulation(WIDTH, HEIGHT);
    this.simulation.reset();

    this.createBackground();
    this.createVortex();
    this.createPlayer();
    this.createSword();
    this.bindHandlers();
    this.bindPointer();
    this.ui.showMenu();

    if (import.meta.env.DEV) {
      (window as unknown as { __saberDev: unknown }).__saberDev = {
        simulation: this.simulation,
        scene: this,
      };
    }

    this.input.setDefaultCursor("none");
    this.scale.on("resize", () => this.input.setDefaultCursor("none"));
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      if (this.simulation.phase === "running") {
        this.simulation.pause();
        this.ui.update(this.simulation);
      }
    });
  }

  update(time: number, deltaMilliseconds: number): void {
    const delta = Math.min(0.05, deltaMilliseconds / 1000);
    this.animateWorld(time);
    this.simulation.update(delta, this.pointerTarget.x, this.pointerTarget.y);

    this.playEffects(this.simulation.drainEffects());
    this.syncPlayer(time, delta);
    this.syncSword(time, delta);
    this.syncEnemies();
    this.syncOrbs(time);
    this.ui.update(this.simulation);
    this.handlePhaseChange();
  }

  private createBackground(): void {
    const background = this.add.graphics().setDepth(0);
    background.fillStyle(0x070511, 1);
    background.fillRect(0, 0, WIDTH, HEIGHT);

    for (let radius = 720; radius >= 70; radius -= 46) {
      const alpha = 0.006 + ((720 - radius) / 720) * 0.02;
      background.fillStyle(0x26174e, alpha);
      background.fillCircle(WIDTH / 2, HEIGHT / 2, radius);
    }

    background.lineStyle(1, 0x7f66c9, 0.055);
    for (let ring = 110; ring <= 650; ring += 54) {
      background.strokeCircle(WIDTH / 2, HEIGHT / 2, ring);
    }

    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * TAU;
      const inner = 120;
      const outer = index % 3 === 0 ? 610 : 540;
      background.lineStyle(index % 3 === 0 ? 1.2 : 0.7, 0x8b71d7, index % 3 === 0 ? 0.075 : 0.035);
      background.lineBetween(
        WIDTH / 2 + Math.cos(angle) * inner,
        HEIGHT / 2 + Math.sin(angle) * inner,
        WIDTH / 2 + Math.cos(angle) * outer,
        HEIGHT / 2 + Math.sin(angle) * outer,
      );
    }

    const starLayer = this.add.container(0, 0).setDepth(1);
    for (let index = 0; index < 100; index += 1) {
      const x = Phaser.Math.Between(24, WIDTH - 24);
      const y = Phaser.Math.Between(24, HEIGHT - 24);
      const radius = Phaser.Math.FloatBetween(0.45, 1.5);
      const color = index % 7 === 0 ? 0xffd782 : index % 5 === 0 ? 0xff82cc : 0xcbbcff;
      const star = this.add.circle(x, y, radius, color, Phaser.Math.FloatBetween(0.15, 0.55));
      starLayer.add(star);
      if (index % 9 === 0) {
        this.tweens.add({
          targets: star,
          alpha: { from: star.alpha, to: 0.08 },
          duration: Phaser.Math.Between(1400, 3600),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 1800),
        });
      }
    }
  }

  private createVortex(): void {
    this.vortexLayer = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(2);
    const rings = this.add.graphics();
    const colors = [0xffd782, 0x9d7bff, 0x7ef8ff];
    const radii = [138, 206, 274];

    radii.forEach((radius, index) => {
      rings.lineStyle(index === 0 ? 1.5 : 1, colors[index], index === 0 ? 0.25 : 0.13);
      rings.strokeEllipse(0, 0, radius * 2, radius * 0.72);
      rings.lineStyle(1, colors[index], index === 0 ? 0.2 : 0.09);
      rings.beginPath();
      rings.arc(0, 0, radius, 0.2 + index * 0.7, 2.1 + index * 0.7, false);
      rings.strokePath();
    });
    this.vortexLayer.add(rings);

    for (let index = 0; index < 28; index += 1) {
      const radius = 155 + (index % 4) * 31;
      const angle = (index / 28) * TAU;
      const dot = this.add.circle(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.84, index % 6 === 0 ? 1.5 : 0.8, index % 5 === 0 ? 0xffd782 : 0x9d7bff, 0.25);
      this.vortexLayer.add(dot);
    }

    this.tweens.add({
      targets: this.vortexLayer,
      rotation: TAU,
      duration: 52000,
      repeat: -1,
    });

    this.sigil = this.add.graphics().setPosition(WIDTH / 2, HEIGHT / 2).setDepth(3);
    this.sigil.lineStyle(1, 0xffd782, 0.26);
    this.sigil.strokeCircle(0, 0, 82);
    this.sigil.strokeCircle(0, 0, 70);
    this.sigil.lineStyle(1, 0x7ef8ff, 0.16);
    this.sigil.strokeCircle(0, 0, 54);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * TAU;
      this.sigil.lineStyle(index % 2 === 0 ? 1.3 : 0.7, index % 2 === 0 ? 0xffd782 : 0x9d7bff, 0.2);
      this.sigil.lineBetween(Math.cos(angle) * 72, Math.sin(angle) * 72, Math.cos(angle) * 88, Math.sin(angle) * 88);
    }
    this.tweens.add({
      targets: this.sigil,
      rotation: -TAU,
      duration: 42000,
      repeat: -1,
    });
  }

  private createPlayer(): void {
    this.playerAura = this.add.image(WIDTH / 2, HEIGHT / 2 - 12, "spark").setDepth(6).setScale(5.8).setAlpha(0.34).setTint(0x8d67ff);
    this.player = this.add
      .image(WIDTH / 2, HEIGHT / 2 + 5, "player")
      .setOrigin(0.5, 0.59)
      .setScale(0.58)
      .setDepth(8);

    this.playerRings = this.add.container(WIDTH / 2, HEIGHT / 2 + 28).setDepth(7);
    const ring = this.add.graphics();
    ring.lineStyle(1.2, 0x9d7bff, 0.3);
    ring.strokeEllipse(0, 0, 150, 54);
    ring.lineStyle(0.8, 0x7ef8ff, 0.16);
    ring.strokeEllipse(0, 0, 190, 72);
    this.playerRings.add(ring);
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * TAU;
      const rune = this.add.circle(Math.cos(angle) * 82, Math.sin(angle) * 26, 2, 0xffd782, 0.6);
      this.playerRings.add(rune);
    }

    this.tweens.add({
      targets: this.playerAura,
      alpha: { from: 0.27, to: 0.43 },
      scale: { from: 5.5, to: 6.2 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: this.playerRings,
      rotation: TAU,
      duration: 18000,
      repeat: -1,
    });
  }

  private createSword(): void {
    this.swordTrail = this.add.graphics().setDepth(9);
    this.swordGlow = this.add.graphics().setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    this.swordBlade = this.add.graphics().setDepth(11);
    this.swordReticle = this.add.graphics().setDepth(12);
  }

  private bindHandlers(): void {
    this.ui.bindHandlers({
      onStart: () => this.beginRun(),
      onPause: () => {
        this.simulation.pause();
        this.ui.update(this.simulation);
      },
      onResume: () => {
        this.simulation.resume();
        this.ui.update(this.simulation);
      },
      onRestart: () => this.beginRun(),
      onMenu: () => this.returnToMenu(),
      onUpgrade: (id) => {
        this.simulation.chooseUpgrade(id);
        this.ui.update(this.simulation);
      },
    });
  }

  private bindPointer(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerTarget.set(pointer.x, pointer.y);
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerTarget.set(pointer.x, pointer.y);
    });
  }

  private beginRun(): void {
    this.clearViews();
    this.simulation.start();
    this.afterimages = [];
    this.lastPhase = "running";
    this.ui.beginRun();
    this.ui.update(this.simulation);
  }

  private returnToMenu(): void {
    this.clearViews();
    this.simulation.returnToMenu();
    this.afterimages = [];
    this.lastPhase = "menu";
    this.ui.showMenu();
  }

  private animateWorld(time: number): void {
    this.playerAura.rotation = time * 0.00022;
    this.sigil.setAlpha(0.75 + Math.sin(time * 0.0015) * 0.12);
  }

  private syncPlayer(time: number, _delta: number): void {
    const bob = Math.sin(time * 0.0024) * 1.4;
    this.player.y = HEIGHT / 2 + 5 + bob;
    this.playerRings.y = HEIGHT / 2 + 28 + bob * 0.4;
    this.playerHurtFlash = Math.max(0, this.playerHurtFlash - _delta);

    if (this.playerHurtFlash > 0) {
      this.player.setTint(0xff7692);
      this.playerAura.setTint(0xff5f86);
    } else {
      this.player.clearTint();
      this.playerAura.setTint(0x8d67ff);
    }
  }

  private syncSword(time: number, delta: number): void {
    const { angle, length, angularSpeed } = this.simulation.aim;
    const startX = WIDTH / 2 + Math.cos(angle) * 25;
    const startY = HEIGHT / 2 + Math.sin(angle) * 25;
    const tipX = WIDTH / 2 + Math.cos(angle) * length;
    const tipY = HEIGHT / 2 + Math.sin(angle) * length;
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const bladeExtended = length + 18;
    const extendedTipX = WIDTH / 2 + directionX * bladeExtended;
    const extendedTipY = HEIGHT / 2 + directionY * bladeExtended;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;

    this.swordGlow.clear();
    this.swordBlade.clear();
    this.swordTrail.clear();
    this.swordReticle.clear();

    if (this.simulation.phase === "menu") {
      this.swordGlow.lineStyle(18, 0x8d67ff, 0.045);
      this.swordGlow.lineBetween(startX, startY, tipX, tipY);
      this.swordBlade.lineStyle(1.6, 0xcdbfff, 0.28);
      this.swordBlade.lineBetween(startX, startY, tipX, tipY);
      return;
    }

    if (this.simulation.phase === "running" && angularSpeed > 1.15) {
      this.afterimages.push({ angle, length, bornAt: time });
    }
    this.afterimages = this.afterimages.filter((afterimage) => time - afterimage.bornAt < 150);
    this.afterimages.slice(-18).forEach((afterimage, index, list) => {
      const strength = (index + 1) / list.length;
      const alpha = strength * 0.14;
      const trailX = WIDTH / 2 + Math.cos(afterimage.angle) * afterimage.length;
      const trailY = HEIGHT / 2 + Math.sin(afterimage.angle) * afterimage.length;
      this.swordTrail.lineStyle(1 + strength * 4.5, 0x7ef8ff, alpha);
      this.swordTrail.lineBetween(startX, startY, trailX, trailY);
      this.swordTrail.lineStyle(0.8, 0xffffff, alpha * 0.7);
      this.swordTrail.lineBetween(
        WIDTH / 2 + Math.cos(afterimage.angle) * afterimage.length * 0.72,
        HEIGHT / 2 + Math.sin(afterimage.angle) * afterimage.length * 0.72,
        trailX,
        trailY,
      );
    });

    this.swordGlow.lineStyle(24, 0x7d55ff, 0.06);
    this.swordGlow.lineBetween(startX, startY, extendedTipX, extendedTipY);
    this.swordGlow.lineStyle(12, 0x7ef8ff, 0.13);
    this.swordGlow.lineBetween(startX, startY, extendedTipX, extendedTipY);
    this.swordGlow.lineStyle(4, 0xdffeff, 0.34);
    this.swordGlow.lineBetween(startX, startY, extendedTipX, extendedTipY);

    this.swordBlade.lineStyle(2.6, 0xffffff, 0.96);
    this.swordBlade.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.fillStyle(0xffffff, 0.96);
    this.swordBlade.fillTriangle(
      tipX + directionX * 17,
      tipY + directionY * 17,
      tipX + perpendicularX * 5,
      tipY + perpendicularY * 5,
      tipX - perpendicularX * 5,
      tipY - perpendicularY * 5,
    );

    this.swordBlade.lineStyle(3, 0xffd782, 0.75);
    this.swordBlade.lineBetween(
      startX + perpendicularX * 10,
      startY + perpendicularY * 10,
      startX - perpendicularX * 10,
      startY - perpendicularY * 10,
    );
    this.swordBlade.fillStyle(0x20123e, 1);
    this.swordBlade.fillCircle(startX, startY, 6);
    this.swordBlade.lineStyle(1.5, 0xffd782, 0.8);
    this.swordBlade.strokeCircle(startX, startY, 6);

    this.swordReticle.lineStyle(1, 0xbefcff, 0.75);
    this.swordReticle.strokeCircle(tipX, tipY, 9);
    this.swordReticle.lineBetween(tipX + perpendicularX * 13, tipY + perpendicularY * 13, tipX + perpendicularX * 18, tipY + perpendicularY * 18);
    this.swordReticle.lineBetween(tipX - perpendicularX * 13, tipY - perpendicularY * 13, tipX - perpendicularX * 18, tipY - perpendicularY * 18);
    this.swordReticle.lineBetween(tipX + directionX * 13, tipY + directionY * 13, tipX + directionX * 18, tipY + directionY * 18);

    if (angularSpeed > 2.8) {
      this.swordReticle.lineStyle(1, 0xffd782, Math.min(0.6, angularSpeed * 0.05));
      this.swordReticle.strokeCircle(tipX, tipY, 15 + Math.min(8, angularSpeed));
    }

    if (delta > 0 && this.simulation.phase === "running") {
      this.pointerTarget.set(
        Phaser.Math.Clamp(this.pointerTarget.x, 2, WIDTH - 2),
        Phaser.Math.Clamp(this.pointerTarget.y, 2, HEIGHT - 2),
      );
    }
  }

  private syncEnemies(): void {
    const liveIds = new Set<number>();
    for (const enemy of this.simulation.enemies) {
      liveIds.add(enemy.id);
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = this.createEnemyView(enemy);
        this.enemyViews.set(enemy.id, view);
      }
      this.positionEnemyView(view, enemy);
    }

    for (const [id, view] of this.enemyViews) {
      if (liveIds.has(id)) continue;
      view.image.destroy();
      view.shadow.destroy();
      this.enemyViews.delete(id);
    }
  }

  private createEnemyView(enemy: Enemy): EnemyView {
    const texture = enemy.kind === "boss" ? "boss" : enemy.kind;
    const shadow = this.add
      .ellipse(enemy.x, enemy.y + enemy.radius * 0.7, enemy.radius * 1.8, enemy.radius * 0.52, 0x030108, 0.48)
      .setDepth(4);
    const image = this.add.image(enemy.x, enemy.y, texture).setDepth(5);
    if (enemy.kind === "boss") {
      image.setScale(1.12);
      this.tweens.add({
        targets: image,
        scale: { from: 1.08, to: 1.17 },
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else if (enemy.kind === "wisp") {
      image.setScale(0.9);
    } else if (enemy.kind === "runner") {
      image.setScale(0.82);
    } else {
      image.setScale(0.92);
    }
    return { image, shadow };
  }

  private positionEnemyView(view: EnemyView, enemy: Enemy): void {
    const bob = enemy.kind === "wisp" ? Math.sin(enemy.phase * 1.7) * 3.5 : 0;
    view.image.setPosition(enemy.x, enemy.y + bob);
    view.shadow.setPosition(enemy.x, enemy.y + enemy.radius * 0.82);

    if (enemy.kind === "runner") {
      view.image.rotation = Math.atan2(enemy.vy, enemy.vx);
    } else if (enemy.kind === "wisp") {
      view.image.rotation = Math.sin(enemy.phase * 0.8) * 0.08;
    } else if (enemy.kind === "brute") {
      view.image.rotation = Math.sin(enemy.phase * 0.4) * 0.05;
    } else if (enemy.kind === "boss") {
      view.image.rotation = enemy.phase * 0.16;
    }

    if (enemy.flash > 0) {
      view.image.setTint(enemy.kind === "boss" ? 0xffd0ff : 0xffffff);
    } else {
      view.image.clearTint();
    }
  }

  private syncOrbs(time: number): void {
    const liveIds = new Set<number>();
    for (const orb of this.simulation.orbs) {
      liveIds.add(orb.id);
      let view = this.orbViews.get(orb.id);
      if (!view) {
        view = {
          image: this.add.image(orb.x, orb.y, "xp-orb").setDepth(4.5).setScale(0.72),
        };
        this.orbViews.set(orb.id, view);
      }
      view.image.setPosition(orb.x, orb.y);
      view.image.rotation = time * 0.0018 + orb.id * 0.4;
      view.image.setAlpha(0.75 + Math.sin(time * 0.008 + orb.id) * 0.2);
    }
    for (const [id, view] of this.orbViews) {
      if (liveIds.has(id)) continue;
      view.image.destroy();
      this.orbViews.delete(id);
    }
  }

  private playEffects(effects: EffectEvent[]): void {
    for (const effect of effects) {
      if (effect.kind === "hit" || effect.kind === "crit") {
        this.spawnHitSparks(effect);
      } else if (effect.kind === "kill") {
        this.spawnKillBurst(effect);
      } else if (effect.kind === "hurt") {
        this.playerHurtFlash = 0.18;
        this.cameras.main.shake(110, 0.0045);
        this.ui.flashDamage();
      } else if (effect.kind === "level" || effect.kind === "orb") {
        this.spawnSparkle(effect.x, effect.y, effect.kind === "level" ? 0x7ef8ff : 0xffd782);
      } else if (effect.kind === "echo") {
        const radius = effect.value ?? 190;
        const ring = this.add.circle(effect.x, effect.y, radius, 0x7ef8ff, 0.04).setStrokeStyle(2, 0x7ef8ff, 0.7).setDepth(14);
        this.tweens.add({
          targets: ring,
          scale: { from: 0.18, to: 1.25 },
          alpha: { from: 0.75, to: 0 },
          duration: 480,
          ease: "Cubic.easeOut",
          onComplete: () => ring.destroy(),
        });
      }
    }
  }

  private spawnHitSparks(effect: EffectEvent): void {
    const count = effect.kind === "crit" ? 6 : 3;
    const color = effect.kind === "crit" ? 0xffd782 : 0x7ef8ff;
    const direction = effect.angle ?? 0;
    for (let index = 0; index < count; index += 1) {
      const spark = this.add.image(effect.x, effect.y, "spark").setTint(color).setDepth(16).setScale(effect.kind === "crit" ? 0.7 : 0.45);
      const spread = Phaser.Math.FloatBetween(-0.8, 0.8) + direction;
      const distance = Phaser.Math.Between(16, effect.kind === "crit" ? 64 : 38);
      this.tweens.add({
        targets: spark,
        x: effect.x + Math.cos(spread) * distance,
        y: effect.y + Math.sin(spread) * distance,
        scale: 0.08,
        alpha: 0,
        duration: Phaser.Math.Between(130, 280),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
    if (effect.kind === "crit") {
      this.cameras.main.shake(35, 0.0012);
    }
  }

  private spawnKillBurst(effect: EffectEvent): void {
    const isBoss = (effect.value ?? 0) > 0;
    const count = isBoss ? 34 : 7;
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, TAU);
      const distance = Phaser.Math.Between(isBoss ? 50 : 20, isBoss ? 220 : 58);
      const effectColor = effect.color ? Number.parseInt(effect.color.replace("#", ""), 16) : 0x9d7bff;
      const color = index % 3 === 0 ? 0xffffff : effectColor;
      const spark = this.add.image(effect.x, effect.y, "spark").setTint(color).setDepth(16).setScale(isBoss ? 1 : 0.5);
      this.tweens.add({
        targets: spark,
        x: effect.x + Math.cos(angle) * distance,
        y: effect.y + Math.sin(angle) * distance,
        scale: 0.05,
        alpha: 0,
        duration: Phaser.Math.Between(isBoss ? 500 : 180, isBoss ? 1000 : 420),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
    if (isBoss) {
      this.cameras.main.flash(320, 255, 130, 205);
      this.cameras.main.shake(260, 0.009);
    }
  }

  private spawnSparkle(x: number, y: number, color: number): void {
    const sparkle = this.add.image(x, y, "spark").setTint(color).setDepth(15).setScale(0.5);
    this.tweens.add({
      targets: sparkle,
      scale: 1.2,
      alpha: 0,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => sparkle.destroy(),
    });
  }

  private handlePhaseChange(): void {
    const phase = this.simulation.phase;
    if (phase === this.lastPhase) return;

    if (phase === "gameover" || phase === "victory") {
      this.afterimages = [];
    }
    if (phase === "menu") {
      this.clearViews();
    }
    this.lastPhase = phase;
  }

  private clearViews(): void {
    for (const view of this.enemyViews.values()) {
      view.image.destroy();
      view.shadow.destroy();
    }
    this.enemyViews.clear();
    for (const view of this.orbViews.values()) {
      view.image.destroy();
    }
    this.orbViews.clear();
  }
}
