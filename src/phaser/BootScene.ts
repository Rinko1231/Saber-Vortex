import Phaser from "phaser";
import { CHARACTER_DEFINITIONS } from "../game/characters";

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
    this.createCharacterTextures();
    this.scene.start("GameScene");
  }

  private createCharacterTextures(): void {
    const source = this.textures.get("player").getSourceImage() as HTMLImageElement;
    for (const character of CHARACTER_DEFINITIONS) {
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 300;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.drawImage(source, 0, 0, 220, 300);
      context.globalCompositeOperation = "source-atop";
      context.globalAlpha = 0.42;
      context.fillStyle = character.cssColor;
      context.fillRect(0, 0, 220, 300);
      this.textures.addCanvas(`${character.id}-chibi`, canvas);
    }
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
