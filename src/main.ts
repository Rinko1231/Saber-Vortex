import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./phaser/BootScene";
import { GameScene } from "./phaser/GameScene";
import { UI } from "./ui/UI";

const ui = new UI();

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-root",
  width: 1280,
  height: 720,
  backgroundColor: "#070511",
  antialias: true,
  roundPixels: false,
  render: {
    powerPreference: "high-performance",
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
});

game.registry.set("ui", ui);
ui.showMenu();
