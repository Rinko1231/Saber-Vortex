import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    this.load.image("player", `${base}assets/player.svg`);
    this.load.image("wisp", `${base}assets/wisp.svg`);
    this.load.image("runner", `${base}assets/runner.svg`);
    this.load.image("brute", `${base}assets/brute.svg`);
    this.load.image("boss", `${base}assets/boss.svg`);
    this.load.image("xp-orb", `${base}assets/xp.svg`);
  }

  create(): void {
    this.createParticleTextures();
    this.scene.start("GameScene");
  }

  private createParticleTextures(): void {
    const dot = this.make.graphics({ x: 0, y: 0 });
    dot.fillStyle(0xffffff, 1);
    dot.fillCircle(6, 6, 6);
    dot.generateTexture("dot", 12, 12);
    dot.clear();
    dot.fillStyle(0x7ef8ff, 0.32);
    dot.fillCircle(18, 18, 18);
    dot.fillStyle(0xffffff, 1);
    dot.fillCircle(18, 18, 3.5);
    dot.generateTexture("spark", 36, 36);
    dot.destroy();
  }
}
