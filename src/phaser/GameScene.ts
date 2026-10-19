import Phaser from "phaser";
import type { CharacterId } from "../game/characters";
import { SaberSimulation, type EffectEvent, type Enemy, type Projectile } from "../game/simulation";
import type { UI } from "../ui/UI";

const TAU = Math.PI * 2;

interface EnemyView {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  marker: Phaser.GameObjects.Graphics;
}

interface OrbView {
  image: Phaser.GameObjects.Image;
}

interface BladeAfterimage {
  angle: number;
  length: number;
  secondaryLength?: number;
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
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private playerNameText!: Phaser.GameObjects.Text;
  private enemyViews = new Map<number, EnemyView>();
  private orbViews = new Map<number, OrbView>();
  private afterimages: BladeAfterimage[] = [];
  private pointerTarget = new Phaser.Math.Vector2(640, 170);
  private worldWidth = 1280;
  private worldHeight = 720;
  private centerX = 640;
  private centerY = 360;
  private pointerLocked = false;
  private pointerLockEnabled = !new URLSearchParams(window.location.search).has("nopointerlock");
  private playerHurtFlash = 0;
  private lastPhase = "menu";

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.ui = this.registry.get("ui") as UI;
    this.worldWidth = this.scale.width;
    this.worldHeight = this.scale.height;
    this.centerX = this.worldWidth / 2;
    this.centerY = this.worldHeight / 2;
    this.pointerTarget.set(this.centerX, this.centerY - 190);
    this.simulation = new SaberSimulation(this.worldWidth, this.worldHeight);
    this.simulation.reset();

    this.createBackground();
    this.createVortex();
    this.createPlayer();
    this.createSword();
    this.bindHandlers();
    this.bindPointer();
    this.bindPointerLock();
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
    this.syncWeapon(time, delta);
    this.syncEnemies();
    this.syncOrbs(time);
    this.syncProjectiles();
    this.ui.update(this.simulation);
    this.handlePhaseChange();
  }

  private createBackground(): void {
    const background = this.add.graphics().setDepth(0);
    background.fillStyle(0x070511, 1);
    background.fillRect(0, 0, this.worldWidth, this.worldHeight);
    const maxRadius = Math.hypot(this.worldWidth, this.worldHeight) * 0.58;

    for (let radius = maxRadius; radius >= 70; radius -= 46) {
      const alpha = 0.006 + ((maxRadius - radius) / maxRadius) * 0.02;
      background.fillStyle(0x26174e, alpha);
      background.fillCircle(this.centerX, this.centerY, radius);
    }

    background.lineStyle(1, 0x7f66c9, 0.055);
    for (let ring = 110; ring <= maxRadius; ring += 54) {
      background.strokeCircle(this.centerX, this.centerY, ring);
    }

    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * TAU;
      const inner = 120;
      const outer = index % 3 === 0 ? 610 : 540;
      background.lineStyle(index % 3 === 0 ? 1.2 : 0.7, 0x8b71d7, index % 3 === 0 ? 0.075 : 0.035);
      background.lineBetween(
        this.centerX + Math.cos(angle) * inner,
        this.centerY + Math.sin(angle) * inner,
        this.centerX + Math.cos(angle) * outer,
        this.centerY + Math.sin(angle) * outer,
      );
    }

    const starLayer = this.add.container(0, 0).setDepth(1);
    for (let index = 0; index < 100; index += 1) {
      const x = Phaser.Math.Between(24, this.worldWidth - 24);
      const y = Phaser.Math.Between(24, this.worldHeight - 24);
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
    this.vortexLayer = this.add.container(this.centerX, this.centerY).setDepth(2);
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

    this.sigil = this.add.graphics().setPosition(this.centerX, this.centerY).setDepth(3);
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
    this.playerAura = this.add.image(this.centerX, this.centerY - 12, "spark").setDepth(6).setScale(5.8).setAlpha(0.34).setTint(0x8d67ff);
    this.player = this.add
      .image(this.centerX, this.centerY + 5, "constella-chibi")
      .setOrigin(0.5, 0.59)
      .setScale(0.58)
      .setDepth(8);

    this.playerRings = this.add.container(this.centerX, this.centerY + 28).setDepth(7);
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
    this.playerNameText = this.add
      .text(this.centerX, this.centerY + 106, "", {
        fontFamily: '"Palatino Linotype", "Noto Serif SC", serif',
        fontSize: "11px",
        color: "#d9cef7",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(0.72);
  }

  private createSword(): void {
    this.swordTrail = this.add.graphics().setDepth(9);
    this.swordGlow = this.add.graphics().setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    this.swordBlade = this.add.graphics().setDepth(11);
    this.swordReticle = this.add.graphics().setDepth(12);
    this.projectileGraphics = this.add.graphics().setDepth(13);
  }

  private bindHandlers(): void {
    this.ui.bindHandlers({
      onStart: (characterId) => this.beginRun(characterId),
      onPause: () => {
        this.simulation.pause();
        this.releasePointerLock();
        this.ui.update(this.simulation);
      },
      onResume: () => {
        this.simulation.resume();
        this.requestPointerLock();
        this.ui.update(this.simulation);
      },
      onRestart: () => this.beginRun(this.simulation.characterId),
      onMenu: () => this.returnToMenu(),
      onUpgrade: (id) => {
        this.simulation.chooseUpgrade(id);
        this.ui.update(this.simulation);
      },
      onSkill: () => {
        this.simulation.activateSkill();
        this.ui.update(this.simulation);
      },
    });
  }

  private bindPointer(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerLocked && this.simulation.phase === "running") {
        this.pointerTarget.set(pointer.x, pointer.y);
      }
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.simulation.phase !== "running") return;
      if (!this.pointerLocked) {
        this.requestPointerLock();
        this.pointerTarget.set(pointer.x, pointer.y);
      }
    });
  }

  private bindPointerLock(): void {
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.game.canvas;
      if (this.pointerLocked && !locked && this.simulation.phase === "running") {
        this.simulation.pause();
        this.ui.update(this.simulation);
      }
      this.pointerLocked = locked;
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked || this.simulation.phase !== "running") return;
      const rect = this.game.canvas.getBoundingClientRect();
      const scaleX = this.worldWidth / Math.max(1, rect.width);
      const scaleY = this.worldHeight / Math.max(1, rect.height);
      this.pointerTarget.x += event.movementX * scaleX;
      this.pointerTarget.y += event.movementY * scaleY;
      const dx = this.pointerTarget.x - this.centerX;
      const dy = this.pointerTarget.y - this.centerY;
      const distance = Math.hypot(dx, dy);
      const maxDistance = Math.max(180, this.simulation.stats.maxBlade * 1.12);
      if (distance > maxDistance) {
        this.pointerTarget.x = this.centerX + (dx / distance) * maxDistance;
        this.pointerTarget.y = this.centerY + (dy / distance) * maxDistance;
      }
    });
  }

  private requestPointerLock(): void {
    if (!this.pointerLockEnabled) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (document.pointerLockElement === this.game.canvas) return;
    const result = this.game.canvas.requestPointerLock();
    if (result instanceof Promise) void result.catch(() => undefined);
  }

  private releasePointerLock(): void {
    if (document.pointerLockElement === this.game.canvas) document.exitPointerLock();
  }

  private beginRun(characterId: CharacterId): void {
    this.clearViews();
    this.simulation.start(characterId);
    this.pointerTarget.set(this.centerX, this.centerY - Math.max(180, this.simulation.stats.minBlade + 110));
    this.afterimages = [];
    this.lastPhase = "running";
    this.applyCharacterLook();
    this.ui.beginRun();
    this.ui.update(this.simulation);
    this.requestPointerLock();
  }

  private returnToMenu(): void {
    this.releasePointerLock();
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
    this.player.y = this.centerY + 5 + bob;
    this.playerRings.y = this.centerY + 28 + bob * 0.4;
    this.playerHurtFlash = Math.max(0, this.playerHurtFlash - _delta);

    if (this.playerHurtFlash > 0) {
      this.player.setTint(0xff7692);
      this.playerAura.setTint(0xff5f86);
    } else {
      this.player.clearTint();
      this.playerAura.setTint(this.simulation.character.color);
    }
  }

  private syncWeapon(time: number, _delta: number): void {
    this.swordGlow.clear();
    this.swordBlade.clear();
    this.swordTrail.clear();
    this.swordReticle.clear();

    const sim = this.simulation;
    const aim = sim.aim;
    const color = sim.character.color;
    const speed = Math.hypot(aim.angularSpeed * aim.length, aim.radialSpeed);

    if (sim.phase === "menu") {
      this.drawBeam(aim.angle, 170, 0x9d7bff, 1.2);
      return;
    }

    if (sim.phase === "running" && (aim.angularSpeed > 0.8 || Math.abs(aim.radialSpeed) > 180)) {
      this.afterimages.push({
        angle: aim.angle,
        length: aim.length,
        secondaryLength: sim.character.weaponKind === "twinblade" ? sim.runtime.secondaryLength : undefined,
        bornAt: time,
      });
    }
    this.afterimages = this.afterimages.filter((afterimage) => time - afterimage.bornAt < 150);

    if (sim.character.weaponKind !== "orb") {
      this.drawAfterimages(color);
    }

    switch (sim.character.weaponKind) {
      case "lightsaber":
        this.drawBeam(aim.angle, aim.length, color, 3.4);
        this.drawHandle(aim.angle, color);
        break;
      case "twinblade":
        this.drawBeam(aim.angle, aim.length, 0xffd782, 2.6);
        this.drawBeam(aim.angle + Math.PI, sim.runtime.secondaryLength, 0xff9fbc, 2.6);
        this.drawTip(aim.angle, aim.length, 0xffd782);
        this.drawTip(aim.angle + Math.PI, sim.runtime.secondaryLength, 0xff9fbc);
        if (sim.skillActiveRemaining > 0) {
          this.swordReticle.lineStyle(1, 0xffffff, 0.35);
          this.swordReticle.strokeCircle(this.centerX, this.centerY, 112);
        }
        break;
      case "sleeve":
        this.drawSleeve(time, color);
        break;
      case "orb":
        this.drawOrb(color);
        break;
      case "rapier":
        this.drawRapier(aim.angle, aim.length, color);
        break;
      case "greatsword":
        this.drawGreatsword(aim.angle, aim.length, color);
        break;
    }

    this.drawReticle(color, speed);
  }

  private applyCharacterLook(): void {
    const character = this.simulation.character;
    this.player.setTexture(`${character.id}-chibi`);
    this.player.clearTint();
    this.playerAura.setTint(character.color);
    this.playerNameText.setText(character.name);
    this.playerNameText.setColor(character.cssColor);
  }

  private drawAfterimages(color: number): void {
    const twin = this.simulation.character.weaponKind === "twinblade";
    this.afterimages.forEach((afterimage, index, list) => {
      const strength = (index + 1) / Math.max(1, list.length);
      const alpha = strength * (twin ? 0.16 : 0.13);
      const tipX = this.centerX + Math.cos(afterimage.angle) * afterimage.length;
      const tipY = this.centerY + Math.sin(afterimage.angle) * afterimage.length;
      this.swordTrail.lineStyle(1 + strength * (twin ? 3.2 : 4.8), color, alpha);
      this.swordTrail.lineBetween(this.centerX, this.centerY, tipX, tipY);
      if (twin && afterimage.secondaryLength) {
        const secondaryAngle = afterimage.angle + Math.PI;
        const secondaryTipX = this.centerX + Math.cos(secondaryAngle) * afterimage.secondaryLength;
        const secondaryTipY = this.centerY + Math.sin(secondaryAngle) * afterimage.secondaryLength;
        this.swordTrail.lineStyle(1 + strength * 3.2, 0xff9fbc, alpha);
        this.swordTrail.lineBetween(this.centerX, this.centerY, secondaryTipX, secondaryTipY);
      }
    });
  }

  private drawBeam(angle: number, length: number, color: number, coreWidth: number): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const startX = this.centerX + directionX * 25;
    const startY = this.centerY + directionY * 25;
    const tipX = this.centerX + directionX * length;
    const tipY = this.centerY + directionY * length;
    const extendedTipX = this.centerX + directionX * (length + 18);
    const extendedTipY = this.centerY + directionY * (length + 18);
    this.swordGlow.lineStyle(coreWidth * 7, color, 0.055);
    this.swordGlow.lineBetween(startX, startY, extendedTipX, extendedTipY);
    this.swordGlow.lineStyle(coreWidth * 3.5, color, 0.13);
    this.swordGlow.lineBetween(startX, startY, extendedTipX, extendedTipY);
    this.swordGlow.lineStyle(coreWidth * 1.3, 0xe9feff, 0.32);
    this.swordGlow.lineBetween(startX, startY, extendedTipX, extendedTipY);
    this.swordBlade.lineStyle(coreWidth * 0.8, 0xffffff, 0.96);
    this.swordBlade.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.fillStyle(0xffffff, 0.96);
    this.swordBlade.fillTriangle(
      extendedTipX,
      extendedTipY,
      tipX - directionY * 5,
      tipY + directionX * 5,
      tipX + directionY * 5,
      tipY - directionX * 5,
    );
  }

  private drawHandle(angle: number, color: number): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const startX = this.centerX + directionX * 25;
    const startY = this.centerY + directionY * 25;
    this.swordBlade.lineStyle(3, color, 0.85);
    this.swordBlade.lineBetween(startX - directionY * 10, startY + directionX * 10, startX + directionY * 10, startY - directionX * 10);
    this.swordBlade.fillStyle(0x20123e, 1);
    this.swordBlade.fillCircle(startX, startY, 6);
    this.swordBlade.lineStyle(1.5, color, 0.9);
    this.swordBlade.strokeCircle(startX, startY, 6);
  }

  private drawTip(angle: number, length: number, color: number): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const tipX = this.centerX + directionX * length;
    const tipY = this.centerY + directionY * length;
    this.swordReticle.fillStyle(color, 0.9);
    this.swordReticle.fillCircle(tipX, tipY, 3.2);
  }

  private drawSleeve(time: number, color: number): void {
    const sim = this.simulation;
    const length = sim.aim.length;
    const points: Phaser.Types.Math.Vector2Like[] = [];
    for (let index = 0; index <= 20; index += 1) {
      const t = index / 20;
      const radius = t * length;
      const wave = Math.sin(t * Math.PI * 2.4 + time * 0.0035) * (1 - t) * 16;
      const angle = sim.aim.angle + wave / Math.max(60, length);
      points.push({ x: this.centerX + Math.cos(angle) * radius, y: this.centerY + Math.sin(angle) * radius });
    }
    for (let index = 1; index < points.length; index += 1) {
      const t = index / (points.length - 1);
      this.swordGlow.lineStyle(8 + t * 9, color, 0.035 + t * 0.08);
      this.swordGlow.lineBetween(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
      if (t > 0.62) {
        this.swordBlade.lineStyle(1.2 + (t - 0.62) * 3, 0xeaffff, 0.28 + t * 0.55);
        this.swordBlade.lineBetween(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
      }
    }
    const tip = points[points.length - 1];
    this.swordReticle.fillStyle(0xeaffc2, 0.95);
    this.swordReticle.fillCircle(tip.x, tip.y, 5);
    this.swordReticle.lineStyle(1, color, 0.55);
    this.swordReticle.strokeCircle(tip.x, tip.y, 13 + Math.sin(time * 0.008) * 2);
  }

  private drawOrb(color: number): void {
    const sim = this.simulation;
    const orbX = sim.runtime.orbX;
    const orbY = sim.runtime.orbY;
    this.swordGlow.lineStyle(2, color, 0.13);
    this.swordGlow.lineBetween(this.centerX, this.centerY, orbX, orbY);
    this.swordGlow.fillStyle(color, 0.13);
    this.swordGlow.fillCircle(orbX, orbY, sim.stats.orbRadius * 2.1);
    this.swordBlade.fillStyle(color, 0.8);
    this.swordBlade.fillCircle(orbX, orbY, sim.stats.orbRadius);
    this.swordBlade.fillStyle(0xffffff, 0.9);
    this.swordBlade.fillCircle(orbX, orbY, Math.max(4, sim.stats.orbRadius * 0.32));
    this.swordReticle.lineStyle(1, color, 0.22);
    this.swordReticle.strokeCircle(orbX, orbY, sim.stats.satelliteRadius + 6);
    for (let index = 0; index < sim.stats.satelliteCount; index += 1) {
      const angle = sim.runtime.orbitPhase + (index / sim.stats.satelliteCount) * TAU;
      const satelliteX = orbX + Math.cos(angle) * sim.stats.satelliteRadius;
      const satelliteY = orbY + Math.sin(angle) * sim.stats.satelliteRadius;
      this.swordGlow.fillStyle(color, 0.2);
      this.swordGlow.fillCircle(satelliteX, satelliteY, 15 * sim.stats.satelliteSize);
      this.swordBlade.fillStyle(0xffffff, 0.85);
      this.swordBlade.fillCircle(satelliteX, satelliteY, 8 * sim.stats.satelliteSize);
      this.swordBlade.fillStyle(color, 0.85);
      this.swordBlade.fillCircle(satelliteX, satelliteY, 4.5 * sim.stats.satelliteSize);
    }
  }

  private drawRapier(angle: number, length: number, color: number): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const startX = this.centerX + directionX * 22;
    const startY = this.centerY + directionY * 22;
    const tipX = this.centerX + directionX * length;
    const tipY = this.centerY + directionY * length;
    this.swordGlow.lineStyle(5, color, 0.08);
    this.swordGlow.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.lineStyle(1.2, 0xffffff, 0.93);
    this.swordBlade.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.fillStyle(0xffffff, 0.96);
    this.swordBlade.fillTriangle(
      tipX + directionX * 22,
      tipY + directionY * 22,
      tipX - directionY * 3,
      tipY + directionX * 3,
      tipX + directionY * 3,
      tipY - directionX * 3,
    );
    this.swordBlade.lineStyle(2, color, 0.9);
    this.swordBlade.lineBetween(startX - directionY * 7, startY + directionX * 7, startX + directionY * 7, startY - directionX * 7);
  }

  private drawGreatsword(angle: number, length: number, color: number): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const startX = this.centerX + directionX * 20;
    const startY = this.centerY + directionY * 20;
    const tipX = this.centerX + directionX * length;
    const tipY = this.centerY + directionY * length;
    this.swordGlow.lineStyle(34, color, 0.055);
    this.swordGlow.lineBetween(startX, startY, tipX, tipY);
    this.swordGlow.lineStyle(18, color, 0.13);
    this.swordGlow.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.lineStyle(7.5, 0xe8f7ff, 0.72);
    this.swordBlade.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.lineStyle(2.4, 0xffffff, 0.92);
    this.swordBlade.lineBetween(startX, startY, tipX, tipY);
    this.swordBlade.fillStyle(0xe8f7ff, 0.88);
    this.swordBlade.fillTriangle(
      tipX + directionX * 20,
      tipY + directionY * 20,
      tipX - directionY * 9,
      tipY + directionX * 9,
      tipX + directionY * 9,
      tipY - directionX * 9,
    );
    const spin = this.simulation.runtime.spinCharge / Math.max(1, this.simulation.stats.heavySpinMax);
    if (spin > 0.01) {
      this.swordReticle.lineStyle(1, color, 0.18 + spin * 0.25);
      this.swordReticle.strokeCircle(this.centerX, this.centerY, 78 + spin * 18);
    }
  }

  private drawReticle(color: number, speed: number): void {
    const sim = this.simulation;
    let tipX = this.centerX + Math.cos(sim.aim.angle) * sim.aim.length;
    let tipY = this.centerY + Math.sin(sim.aim.angle) * sim.aim.length;
    if (sim.character.weaponKind === "orb") {
      tipX = sim.runtime.orbX;
      tipY = sim.runtime.orbY;
    }
    const armed = speed >= sim.stats.minCutSpeed;
    const directionX = Math.cos(sim.aim.angle);
    const directionY = Math.sin(sim.aim.angle);
    this.swordReticle.lineStyle(1, armed ? 0xbefcff : 0xff7896, armed ? 0.75 : 0.35);
    this.swordReticle.strokeCircle(tipX, tipY, 9);
    this.swordReticle.lineBetween(tipX - directionY * 13, tipY + directionX * 13, tipX - directionY * 18, tipY + directionX * 18);
    this.swordReticle.lineBetween(tipX + directionY * 13, tipY - directionX * 13, tipX + directionY * 18, tipY - directionX * 18);
    if (armed) {
      this.swordReticle.lineStyle(1, color, 0.35);
      this.swordReticle.strokeCircle(tipX, tipY, 14);
    }
  }

  private syncProjectiles(): void {
    this.projectileGraphics.clear();
    for (const projectile of this.simulation.projectiles) {
      this.drawProjectile(projectile);
    }
  }

  private drawProjectile(projectile: Projectile): void {
    const color = this.colorToNumber(projectile.color);
    const angle = Math.atan2(projectile.vy, projectile.vx);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    if (projectile.kind === "qi") {
      this.projectileGraphics.lineStyle(10, color, 0.08);
      this.projectileGraphics.lineBetween(
        projectile.x - directionX * 24,
        projectile.y - directionY * 24,
        projectile.x + directionX * 18,
        projectile.y + directionY * 18,
      );
      this.projectileGraphics.lineStyle(2, 0xe9feff, 0.85);
      this.projectileGraphics.lineBetween(
        projectile.x - directionX * 18,
        projectile.y - directionY * 18,
        projectile.x + directionX * 14,
        projectile.y + directionY * 14,
      );
      this.projectileGraphics.fillStyle(color, 0.5);
      this.projectileGraphics.fillTriangle(
        projectile.x + directionX * 24,
        projectile.y + directionY * 24,
        projectile.x - perpendicularX * 7,
        projectile.y - perpendicularY * 7,
        projectile.x + perpendicularX * 7,
        projectile.y + perpendicularY * 7,
      );
    } else if (projectile.kind === "talisman") {
      const backX = projectile.x - directionX * 10;
      const backY = projectile.y - directionY * 10;
      const frontX = projectile.x + directionX * 10;
      const frontY = projectile.y + directionY * 10;
      this.projectileGraphics.fillStyle(0xf6ffd6, 0.9);
      this.projectileGraphics.fillPoints(
        [
          { x: backX - perpendicularX * 5, y: backY - perpendicularY * 5 },
          { x: backX + perpendicularX * 5, y: backY + perpendicularY * 5 },
          { x: frontX + perpendicularX * 5, y: frontY + perpendicularY * 5 },
          { x: frontX - perpendicularX * 5, y: frontY - perpendicularY * 5 },
        ],
        true,
      );
      this.projectileGraphics.lineStyle(1, color, 0.75);
      this.projectileGraphics.lineBetween(
        projectile.x - perpendicularX * 3,
        projectile.y - perpendicularY * 3,
        projectile.x + perpendicularX * 3,
        projectile.y + perpendicularY * 3,
      );
    } else {
      this.projectileGraphics.fillStyle(color, 0.2);
      this.projectileGraphics.fillCircle(projectile.x, projectile.y, 13);
      this.projectileGraphics.fillStyle(0xffffff, 0.86);
      this.projectileGraphics.fillCircle(projectile.x, projectile.y, 3.2);
    }
  }

  private colorToNumber(value: string): number {
    return Number.parseInt(value.replace("#", ""), 16);
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
      view.marker.destroy();
      this.enemyViews.delete(id);
    }
  }

  private createEnemyView(enemy: Enemy): EnemyView {
    const texture = enemy.kind === "boss" ? "boss" : enemy.kind;
    const shadow = this.add
      .ellipse(enemy.x, enemy.y + enemy.radius * 0.7, enemy.radius * 1.8, enemy.radius * 0.52, 0x030108, 0.48)
      .setDepth(4);
    const marker = this.add.graphics().setDepth(4.2);
    const image = this.add.image(enemy.x, enemy.y, texture).setDepth(5);
    if (enemy.kind === "boss") {
      const baseScale = 1.02 * enemy.visualScale;
      image.setScale(baseScale);
      this.tweens.add({
        targets: image,
        scale: { from: baseScale * 0.96, to: baseScale * 1.05 },
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else if (enemy.kind === "wisp") {
      image.setScale(0.78 * enemy.visualScale);
    } else if (enemy.kind === "runner") {
      image.setScale(0.72 * enemy.visualScale);
    } else {
      image.setScale(0.8 * enemy.visualScale);
    }
    return { image, shadow, marker };
  }

  private positionEnemyView(view: EnemyView, enemy: Enemy): void {
    const bob = enemy.kind === "wisp" ? Math.sin(enemy.phase * 1.7) * 3.5 : 0;
    view.image.setPosition(enemy.x, enemy.y + bob);
    view.shadow.setPosition(enemy.x, enemy.y + enemy.radius * 0.82);
    view.marker.clear();
    const modifier = enemy.modifiers[0];
    if (modifier) {
      const colors: Record<string, number> = {
        brood: 0x8dffd2,
        volatile: 0xff8f5e,
        slash_weak: 0xffd782,
        thrust_weak: 0xff9b7a,
        blade_slow: 0x7ef8ff,
        side_armor: 0xc7a0ff,
      };
      const color = colors[modifier];
      view.marker.lineStyle(1.3, color, 0.4);
      view.marker.strokeCircle(enemy.x, enemy.y, enemy.radius + 8);
      if (modifier === "side_armor") {
        view.marker.lineStyle(3, color, 0.55);
        for (let index = 0; index < 7; index += 1) {
          const a = enemy.guardAngle - 0.72 + (index / 6) * 1.44;
          const nextA = enemy.guardAngle - 0.72 + ((index + 1) / 6) * 1.44;
          view.marker.lineBetween(
            enemy.x + Math.cos(a) * (enemy.radius + 11),
            enemy.y + Math.sin(a) * (enemy.radius + 11),
            enemy.x + Math.cos(nextA) * (enemy.radius + 11),
            enemy.y + Math.sin(nextA) * (enemy.radius + 11),
          );
        }
      }
    }

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
    } else if (enemy.parryTimer > 0) {
      view.image.setTint(0xdff7ff);
    } else if (enemy.slowTimer > 0) {
      view.image.setTint(0x9bd8ff);
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
        this.spawnRing(effect.x, effect.y, radius, 0x7ef8ff, 480);
      } else if (effect.kind === "skill") {
        const color = effect.color ? this.colorToNumber(effect.color) : 0x7ef8ff;
        this.spawnRing(effect.x, effect.y, 190, color, 620);
        this.spawnSparkle(effect.x, effect.y, color);
      } else if (effect.kind === "parry") {
        const color = effect.color ? this.colorToNumber(effect.color) : 0xa9d9ff;
        this.spawnRing(effect.x, effect.y, effect.value ?? 150, color, 360);
        this.spawnHitSparks({ ...effect, kind: "crit", color: "#e8f7ff" });
        this.cameras.main.shake(80, 0.003);
      } else if (effect.kind === "thrust") {
        this.spawnHitSparks({ ...effect, kind: "crit" });
        const angle = effect.angle ?? 0;
        const line = this.add.graphics().setDepth(16);
        line.lineStyle(3, effect.color ? this.colorToNumber(effect.color) : 0xffd782, 0.8);
        line.lineBetween(
          effect.x - Math.cos(angle) * 28,
          effect.y - Math.sin(angle) * 28,
          effect.x + Math.cos(angle) * 34,
          effect.y + Math.sin(angle) * 34,
        );
        this.tweens.add({
          targets: line,
          alpha: 0,
          duration: 210,
          onComplete: () => line.destroy(),
        });
      }
    }
  }

  private spawnRing(x: number, y: number, radius: number, color: number, duration: number): void {
    const ring = this.add
      .circle(x, y, radius, color, 0.035)
      .setStrokeStyle(2, color, 0.72)
      .setDepth(14);
    this.tweens.add({
      targets: ring,
      scale: { from: 0.16, to: 1.22 },
      alpha: { from: 0.78, to: 0 },
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
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
      this.releasePointerLock();
    }
    if (phase === "menu") {
      this.clearViews();
      this.playerNameText.setText("");
      this.releasePointerLock();
    } else if (phase === "upgrade" || phase === "paused") {
      this.releasePointerLock();
    } else if (phase === "running" && this.lastPhase === "upgrade") {
      this.requestPointerLock();
    }
    this.lastPhase = phase;
  }

  private clearViews(): void {
    for (const view of this.enemyViews.values()) {
      view.image.destroy();
      view.shadow.destroy();
      view.marker.destroy();
    }
    this.enemyViews.clear();
    for (const view of this.orbViews.values()) {
      view.image.destroy();
    }
    this.orbViews.clear();
    this.projectileGraphics.clear();
  }
}
