import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./phaser/BootScene";
import { GameScene } from "./phaser/GameScene";
import { UI } from "./ui/UI";

const ui = new UI();

type DisplayMode = "auto" | "landscape" | "portrait";
const storedMode = (localStorage.getItem("saber-display-mode") as DisplayMode | null) ?? "auto";
const portrait =
  storedMode === "portrait" || (storedMode === "auto" && window.innerHeight > window.innerWidth);
document.body.dataset.displayMode = storedMode;
document.body.classList.toggle("display-portrait", portrait);
const gameWidth = portrait ? 720 : 1280;
const gameHeight = portrait ? 1280 : 720;

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-root",
  width: gameWidth,
  height: gameHeight,
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
