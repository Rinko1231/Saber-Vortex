import type { GamePhase, SaberSimulation, UpgradeIcon, UpgradeOffer } from "../game/simulation";

export interface UIHandlers {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onUpgrade: (id: string) => void;
}

const ICONS: Record<UpgradeIcon, string> = {
  reach: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h16M15 7l5 5-5 5M6 7l-2 5 2 5"/>
    </svg>`,
  power: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m13 2-8 12h6l-1 8 9-13h-6l0-7Z"/>
    </svg>`,
  speed: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h10M3 12h9M5 17h8M16 5l5 7-5 7M14 12h7"/>
    </svg>`,
  heart: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20S3.5 15.2 3.5 8.8A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.5 2.8C20.5 15.2 12 20 12 20Z"/>
      <path d="M8 11h2l1.2-2.5L13 14l1.2-3H17"/>
    </svg>`,
  edge: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20 19 5M14 4h6v6M6 14l4 4M3 17l4 4"/>
    </svg>`,
  star: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>
      <circle cx="19" cy="5" r="1"/>
    </svg>`,
  echo: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7"/>
      <circle cx="12" cy="12" r="3"/>
      <circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/>
    </svg>`,
  ward: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8 20 6v5.4c0 4.7-3.4 8.2-8 9.8-4.6-1.6-8-5.1-8-9.8V6Z"/>
      <path d="M8.5 12h2l1.2-2.7 1.6 5.2 1.1-2.5h1.4"/>
    </svg>`,
};

const RARITY_LABEL = {
  common: "COMMON // 常见",
  rare: "RARE // 稀有",
  epic: "EPIC // 史诗",
} as const;

const formatTime = (seconds: number): string => {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export class UI {
  private handlers: UIHandlers | null = null;
  private lastPhase: GamePhase = "menu";
  private currentPhase: GamePhase = "menu";
  private lastBanner = "";
  private lastUpgradeRendered = "";
  private textCache = new Map<HTMLElement, string>();
  private currentOffers: UpgradeOffer[] = [];
  private started = false;

  private readonly hud = this.query<HTMLElement>("#hud");
  private readonly xpShell = this.query<HTMLElement>("#xp-shell");
  private readonly startScreen = this.query<HTMLElement>("#start-screen");
  private readonly pauseScreen = this.query<HTMLElement>("#pause-screen");
  private readonly upgradeScreen = this.query<HTMLElement>("#upgrade-screen");
  private readonly helpScreen = this.query<HTMLElement>("#help-screen");
  private readonly endScreen = this.query<HTMLElement>("#end-screen");
  private readonly fieldHint = this.query<HTMLElement>("#field-hint");
  private readonly banner = this.query<HTMLElement>("#banner");
  private readonly comboDisplay = this.query<HTMLElement>("#combo-display");
  private readonly upgradeCards = this.query<HTMLElement>("#upgrade-cards");
  private readonly damageFlash = this.query<HTMLElement>("#damage-flash");

  constructor() {
    this.bindStaticEvents();
  }

  bindHandlers(handlers: UIHandlers): void {
    this.handlers = handlers;
  }

  showMenu(): void {
    this.currentPhase = "menu";
    this.started = false;
    this.startScreen.classList.remove("is-hidden");
    this.hud.classList.add("is-hidden");
    this.xpShell.classList.add("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.upgradeScreen.classList.add("is-hidden");
    this.endScreen.classList.add("is-hidden");
    this.helpScreen.classList.add("is-hidden");
    this.comboDisplay.classList.remove("is-active");
    this.banner.classList.remove("is-visible");
    this.fieldHint.classList.remove("is-visible");
    this.lastPhase = "menu";
  }

  beginRun(): void {
    this.started = true;
    this.startScreen.classList.add("is-hidden");
    this.helpScreen.classList.add("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.upgradeScreen.classList.add("is-hidden");
    this.endScreen.classList.add("is-hidden");
    this.hud.classList.remove("is-hidden");
    this.xpShell.classList.remove("is-hidden");
    this.fieldHint.classList.add("is-visible");
    window.setTimeout(() => this.fieldHint.classList.remove("is-visible"), 6500);
    this.lastPhase = "running";
  }

  update(simulation: SaberSimulation): void {
    if (simulation.phase === "menu") {
      this.showMenu();
      return;
    }

    if (this.lastPhase === "menu") {
      this.beginRun();
    }

    this.setText("#hp-text", `${Math.ceil(simulation.stats.hp)} / ${Math.round(simulation.stats.maxHp)}`);
    this.setText("#level-text", String(simulation.level));
    this.setText("#power-text", `刃压 ${Math.round(simulation.stats.damage)}`);
    this.setText("#timer", formatTime(simulation.runDuration - simulation.time));
    this.setText("#wave-label", simulation.waveName);
    this.setText("#kill-text", String(simulation.kills));
    this.setText("#best-combo-text", String(simulation.bestCombo));
    this.setText("#xp-text", `${Math.floor(simulation.xp)} / ${simulation.xpToNext}`);

    const hpRatio = Math.max(0, Math.min(1, simulation.stats.hp / simulation.stats.maxHp));
    const hpFill = this.query<HTMLElement>("#hp-fill");
    hpFill.style.transform = `scaleX(${hpRatio})`;

    const xpRatio = Math.max(0, Math.min(1, simulation.xp / simulation.xpToNext));
    const xpFill = this.query<HTMLElement>("#xp-fill");
    xpFill.style.transform = `scaleX(${xpRatio})`;

    const bossBar = this.query<HTMLElement>("#boss-bar");
    const boss = simulation.boss;
    if (boss) {
      bossBar.classList.remove("is-hidden");
      const bossFill = this.query<HTMLElement>("#boss-fill");
      bossFill.style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
    } else {
      bossBar.classList.add("is-hidden");
    }

    if (simulation.combo >= 3) {
      this.comboDisplay.classList.add("is-active");
      this.setText("#combo-number", String(simulation.combo));
    } else {
      this.comboDisplay.classList.remove("is-active");
    }

    this.updateBanner(simulation);
    this.updatePhase(simulation);
  }

  flashDamage(): void {
    this.damageFlash.classList.remove("is-hit");
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add("is-hit");
  }

  private updateBanner(simulation: SaberSimulation): void {
    if (!simulation.banner) {
      this.banner.classList.remove("is-visible");
      this.lastBanner = "";
      return;
    }

    const key = `${simulation.banner.kicker}|${simulation.banner.title}`;
    if (key !== this.lastBanner) {
      this.lastBanner = key;
      this.setText("#banner-kicker", simulation.banner.kicker);
      this.setText("#banner-title", simulation.banner.title);
    }
    this.banner.classList.add("is-visible");
  }

  private updatePhase(simulation: SaberSimulation): void {
    const phase = simulation.phase;
    this.currentPhase = phase;
    if (phase === this.lastPhase) {
      if (phase === "upgrade") this.ensureUpgradeRendered(simulation);
      return;
    }

    if (phase === "paused") {
      this.pauseScreen.classList.remove("is-hidden");
    } else {
      this.pauseScreen.classList.add("is-hidden");
    }

    if (phase === "upgrade") {
      this.renderUpgrades(simulation);
    } else {
      this.upgradeScreen.classList.add("is-hidden");
    }

    if (phase === "gameover" || phase === "victory") {
      this.renderEnd(simulation);
    } else {
      this.endScreen.classList.add("is-hidden");
    }

    if (phase === "running") {
      this.hud.classList.remove("is-hidden");
      this.xpShell.classList.remove("is-hidden");
    }

    this.lastPhase = phase;
  }

  private ensureUpgradeRendered(simulation: SaberSimulation): void {
    const key = `${simulation.level}|${simulation.upgradeOffers.map((offer) => offer.id).join(",")}`;
    if (key === this.lastUpgradeRendered) return;
    this.renderUpgrades(simulation);
  }

  private renderUpgrades(simulation: SaberSimulation): void {
    this.currentOffers = simulation.upgradeOffers;
    this.lastUpgradeRendered = `${simulation.level}|${this.currentOffers.map((offer) => offer.id).join(",")}`;
    this.setText("#upgrade-level", `LV.${simulation.level}`);
    this.upgradeCards.innerHTML = this.currentOffers
      .map(
        (offer, index) => `
          <button class="upgrade-card" type="button" data-upgrade-id="${offer.id}" data-rarity="${offer.rarity}" data-index="${index}">
            <div class="upgrade-icon">${ICONS[offer.icon] ?? ICONS.star}</div>
            <span class="upgrade-rarity">${RARITY_LABEL[offer.rarity]}</span>
            <h3>${offer.name}</h3>
            <p>${offer.description}</p>
            <p class="upgrade-flavor">${offer.flavor}</p>
            <span class="upgrade-stack">${offer.currentStacks} / ${offer.maxStacks} · 按 ${index + 1}</span>
          </button>`,
      )
      .join("");

    for (const card of this.upgradeCards.querySelectorAll<HTMLButtonElement>("[data-upgrade-id]")) {
      card.addEventListener("click", () => {
        const id = card.dataset.upgradeId;
        if (id) this.handlers?.onUpgrade(id);
      });
    }
    this.upgradeScreen.classList.remove("is-hidden");
  }

  private renderEnd(simulation: SaberSimulation): void {
    const victory = simulation.phase === "victory";
    this.setText("#end-kicker", victory ? "THE VORTEX CLOSED" : "THE CONTRACT BROKE");
    this.setText("#end-title", victory ? "涡流已平息" : "月蚀契约断裂");
    this.setText(
      "#end-copy",
      victory
        ? "你用光刃守住了最后一道月蚀。涡流退去，但剑尖仍在发亮。"
        : "你倒在了涡心。下一次，让剑走得更远一点。",
    );
    this.setText("#end-time", formatTime(simulation.time));
    this.setText("#end-kills", String(simulation.kills));
    this.setText("#end-combo", String(simulation.bestCombo));
    this.setText("#end-level", String(simulation.level));
    this.endScreen.classList.remove("is-hidden");
  }

  private bindStaticEvents(): void {
    this.query<HTMLButtonElement>("#start-button").addEventListener("click", () => this.handlers?.onStart());
    this.query<HTMLButtonElement>("#help-button").addEventListener("click", () => {
      this.helpScreen.classList.remove("is-hidden");
    });
    this.query<HTMLButtonElement>("#help-close").addEventListener("click", () => {
      this.helpScreen.classList.add("is-hidden");
    });
    this.query<HTMLButtonElement>("#pause-button").addEventListener("click", () => this.handlers?.onPause());
    this.query<HTMLButtonElement>("#resume-button").addEventListener("click", () => this.handlers?.onResume());
    this.query<HTMLButtonElement>("#restart-button").addEventListener("click", () => this.handlers?.onRestart());
    this.query<HTMLButtonElement>("#end-restart").addEventListener("click", () => this.handlers?.onRestart());
    this.query<HTMLButtonElement>("#end-menu").addEventListener("click", () => this.handlers?.onMenu());

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;

      if (
        !this.startScreen.classList.contains("is-hidden") &&
        this.helpScreen.classList.contains("is-hidden") &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        this.handlers?.onStart();
        return;
      }

      if (!this.helpScreen.classList.contains("is-hidden") && event.key === "Escape") {
        this.helpScreen.classList.add("is-hidden");
        return;
      }

      if (!this.upgradeScreen.classList.contains("is-hidden")) {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < this.currentOffers.length) {
          event.preventDefault();
          this.handlers?.onUpgrade(this.currentOffers[index].id);
        }
        return;
      }

      if (event.key === "Escape" || event.key.toLowerCase() === "p") {
        if (this.currentPhase === "paused") {
          this.handlers?.onResume();
        } else if (this.started && this.currentPhase === "running") {
          this.handlers?.onPause();
        }
      }
    });
  }

  private setText(selector: string, value: string): void {
    const element = this.query<HTMLElement>(selector);
    if (this.textCache.get(element) === value) return;
    this.textCache.set(element, value);
    element.textContent = value;
  }

  private query<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
}
