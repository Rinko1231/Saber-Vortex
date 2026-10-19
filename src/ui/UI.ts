import {
  CHARACTER_DEFINITIONS,
  getCharacter,
  type CharacterId,
  type CharacterDefinition,
} from "../game/characters";
import {
  getUpgradePreview,
  type GamePhase,
  type SaberSimulation,
  type UpgradeIcon,
  type UpgradeOffer,
} from "../game/simulation";

export interface UIHandlers {
  onStart: (characterId: CharacterId) => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onUpgrade: (id: string) => void;
  onSkill: () => void;
}

type DisplayMode = "auto" | "landscape" | "portrait";

const DISPLAY_MODE_KEY = "saber-display-mode";
const CHARACTER_KEY = "saber-character";

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
  grace: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21c0-8 4-13 9-16-1 8-4 13-9 16ZM12 21C12 13 8 8 3 5c1 8 4 13 9 16Z"/>
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
  qi: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5c7 1 12 5 16 14M6 11c5 1 8 4 11 9M10 4c3 3 5 7 6 12"/>
      <path d="m15 4 4 1-1 4"/>
    </svg>`,
  dual: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4 20 20M20 4 4 20M4 4l2 6M20 4l-2 6M4 20l2-6M20 20l-2-6"/>
    </svg>`,
  paper: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6Z"/>
      <path d="M15 3v5h4M9 11h6M9 14h6M9 17h4"/>
    </svg>`,
  orb: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-24 12 12)"/>
      <circle cx="20" cy="8" r="1.7"/>
    </svg>`,
  thrust: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h15M14 7l6 5-6 5M8 8l-3 4 3 4"/>
      <path d="M19 12h3"/>
    </svg>`,
  spin: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-3-6.2M20 3v6h-6"/>
      <circle cx="12" cy="12" r="2.5"/>
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

const getStoredCharacter = (): CharacterId => {
  const stored = localStorage.getItem(CHARACTER_KEY);
  return CHARACTER_DEFINITIONS.some((character) => character.id === stored)
    ? (stored as CharacterId)
    : CHARACTER_DEFINITIONS[0].id;
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
  private characterSelectOpen = false;
  private selectedCharacterId: CharacterId = getStoredCharacter();

  private readonly hud = this.query<HTMLElement>("#hud");
  private readonly xpShell = this.query<HTMLElement>("#xp-shell");
  private readonly startScreen = this.query<HTMLElement>("#start-screen");
  private readonly characterScreen = this.query<HTMLElement>("#character-screen");
  private readonly pauseScreen = this.query<HTMLElement>("#pause-screen");
  private readonly upgradeScreen = this.query<HTMLElement>("#upgrade-screen");
  private readonly helpScreen = this.query<HTMLElement>("#help-screen");
  private readonly endScreen = this.query<HTMLElement>("#end-screen");
  private readonly fieldHint = this.query<HTMLElement>("#field-hint");
  private readonly banner = this.query<HTMLElement>("#banner");
  private readonly comboDisplay = this.query<HTMLElement>("#combo-display");
  private readonly upgradeCards = this.query<HTMLElement>("#upgrade-cards");
  private readonly damageFlash = this.query<HTMLElement>("#damage-flash");
  private readonly rosterGrid = this.query<HTMLElement>("#roster-grid");
  private readonly characterDetail = this.query<HTMLElement>("#character-detail");
  private readonly skillButton = this.query<HTMLButtonElement>("#skill-button");

  constructor() {
    this.bindStaticEvents();
    this.renderRoster();
    this.syncDisplayModeButtons();
    this.selectCharacter(this.selectedCharacterId, false);
  }

  bindHandlers(handlers: UIHandlers): void {
    this.handlers = handlers;
  }

  showMenu(): void {
    this.characterSelectOpen = false;
    this.currentPhase = "menu";
    this.started = false;
    this.startScreen.classList.remove("is-hidden");
    this.characterScreen.classList.add("is-hidden");
    this.hud.classList.add("is-hidden");
    this.xpShell.classList.add("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.upgradeScreen.classList.add("is-hidden");
    this.endScreen.classList.add("is-hidden");
    this.helpScreen.classList.add("is-hidden");
    this.comboDisplay.classList.remove("is-active");
    this.banner.classList.remove("is-visible");
    this.fieldHint.classList.remove("is-visible");
    this.skillButton.classList.add("is-hidden");
    this.lastPhase = "menu";
  }

  beginRun(): void {
    this.started = true;
    this.characterSelectOpen = false;
    this.startScreen.classList.add("is-hidden");
    this.characterScreen.classList.add("is-hidden");
    this.helpScreen.classList.add("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.upgradeScreen.classList.add("is-hidden");
    this.endScreen.classList.add("is-hidden");
    this.hud.classList.remove("is-hidden");
    this.xpShell.classList.remove("is-hidden");
    this.skillButton.classList.remove("is-hidden");
    this.fieldHint.classList.add("is-visible");
    window.setTimeout(() => this.fieldHint.classList.remove("is-visible"), 6500);
    this.lastPhase = "running";
  }

  update(simulation: SaberSimulation): void {
    if (simulation.phase === "menu") {
      if (!this.characterSelectOpen) this.showMenu();
      return;
    }

    if (this.lastPhase === "menu") this.beginRun();

    this.setText("#character-name", simulation.character.name);
    this.setText("#weapon-name", simulation.character.weaponName);
    this.setText("#hp-text", `${Math.ceil(simulation.stats.hp)} / ${Math.round(simulation.stats.maxHp)}`);
    this.setText("#level-text", String(simulation.level));
    this.setText("#power-text", `刃压 ${Math.round(simulation.stats.damage)}`);
    this.setText("#weapon-text", this.getWeaponMetric(simulation));
    this.setText("#timer", formatTime(simulation.runDuration - simulation.time));
    this.setText("#wave-label", simulation.waveName);
    this.setText("#kill-text", String(simulation.kills));
    this.setText("#best-combo-text", String(simulation.bestCombo));
    this.setText("#xp-text", `${Math.floor(simulation.xp)} / ${simulation.xpToNext}`);

    const hpRatio = Math.max(0, Math.min(1, simulation.stats.hp / simulation.stats.maxHp));
    this.query<HTMLElement>("#hp-fill").style.transform = `scaleX(${hpRatio})`;
    const xpRatio = Math.max(0, Math.min(1, simulation.xp / simulation.xpToNext));
    this.query<HTMLElement>("#xp-fill").style.transform = `scaleX(${xpRatio})`;

    const bossBar = this.query<HTMLElement>("#boss-bar");
    const boss = simulation.boss;
    if (boss) {
      bossBar.classList.remove("is-hidden");
      this.query<HTMLElement>("#boss-fill").style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
    } else {
      bossBar.classList.add("is-hidden");
    }

    if (simulation.combo >= 3) {
      this.comboDisplay.classList.add("is-active");
      this.setText("#combo-number", String(simulation.combo));
    } else {
      this.comboDisplay.classList.remove("is-active");
    }

    this.updateSkill(simulation);
    this.updateBanner(simulation);
    this.updatePhase(simulation);
  }

  flashDamage(): void {
    this.damageFlash.classList.remove("is-hit");
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add("is-hit");
  }

  private getWeaponMetric(simulation: SaberSimulation): string {
    switch (simulation.character.weaponKind) {
      case "lightsaber":
        return `剑气 ${simulation.stats.qiCount}`;
      case "twinblade":
        return `交刃 +${Math.round(simulation.stats.dualAlternateBonus)}`;
      case "sleeve":
        return `符咒 ${simulation.stats.talismanInterval.toFixed(1)}s`;
      case "orb":
        return `卫星 ${simulation.stats.satelliteCount}`;
      case "rapier":
        return `连刺 ${simulation.runtime.thrustChain}/5`;
      case "greatsword":
        return `惯性 ${simulation.runtime.spinCharge.toFixed(1)}`;
    }
  }

  private updateSkill(simulation: SaberSimulation): void {
    const ready = simulation.skillReady && simulation.phase === "running";
    this.setText("#skill-name", simulation.character.skillName);
    this.setText(
      "#skill-status",
      simulation.skillActiveRemaining > 0
        ? `发动中 ${simulation.skillActiveRemaining.toFixed(1)}s`
        : ready
          ? "READY"
          : `${simulation.skillCooldownRemaining.toFixed(1)}s`,
    );
    this.query<HTMLElement>("#skill-fill").style.transform = `scaleX(${simulation.skillCooldownRatio})`;
    this.skillButton.classList.toggle("is-ready", ready);
    this.skillButton.classList.toggle("is-active", simulation.skillActiveRemaining > 0);
    this.skillButton.disabled = !ready && simulation.skillActiveRemaining <= 0;
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

    if (phase === "paused") this.pauseScreen.classList.remove("is-hidden");
    else this.pauseScreen.classList.add("is-hidden");

    if (phase === "upgrade") this.renderUpgrades(simulation);
    else this.upgradeScreen.classList.add("is-hidden");

    if (phase === "gameover" || phase === "victory") this.renderEnd(simulation);
    else this.endScreen.classList.add("is-hidden");

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
      .map((offer, index) => {
        const portrait =
          offer.scope === "character"
            ? `<div class="upgrade-portrait" style="--portrait-color:${offer.accent}" aria-hidden="true">
                 <span></span><em>立绘占位</em>
               </div>`
            : "";
        return `
          <button class="upgrade-card" type="button" data-upgrade-id="${offer.id}" data-rarity="${offer.rarity}" data-index="${index}" style="--accent:${offer.accent}">
            ${portrait}
            <div class="upgrade-icon">${ICONS[offer.icon] ?? ICONS.star}</div>
            <span class="upgrade-rarity">${RARITY_LABEL[offer.rarity]}</span>
            <span class="upgrade-scope">${offer.scope === "character" ? `角色专属 · ${offer.characterName}` : "通用强化"}</span>
            <h3>${offer.name}</h3>
            <p>${offer.description}</p>
            <p class="upgrade-flavor">${offer.flavor}</p>
            <span class="upgrade-stack">${offer.currentStacks} / ${offer.maxStacks} · 按 ${index + 1}</span>
          </button>`;
      })
      .join("");

    for (const card of this.upgradeCards.querySelectorAll<HTMLButtonElement>("[data-upgrade-id]")) {
      card.addEventListener("click", () => {
        const id = card.dataset.upgradeId;
        if (id && !card.disabled) this.handlers?.onUpgrade(id);
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
        ? `${simulation.character.name}守住了最后一道月蚀。涡流退去，但武器仍在发亮。`
        : "你倒在了涡心。下一次，让速度与方向都站到你这边。",
    );
    this.setText("#end-time", formatTime(simulation.time));
    this.setText("#end-kills", String(simulation.kills));
    this.setText("#end-combo", String(simulation.bestCombo));
    this.setText("#end-level", String(simulation.level));
    this.endScreen.classList.remove("is-hidden");
  }

  private openCharacterSelect(): void {
    this.characterSelectOpen = true;
    this.startScreen.classList.add("is-hidden");
    this.characterScreen.classList.remove("is-hidden");
    this.selectCharacter(this.selectedCharacterId, false);
  }

  private closeCharacterSelect(): void {
    this.characterSelectOpen = false;
    this.characterScreen.classList.add("is-hidden");
    this.startScreen.classList.remove("is-hidden");
  }

  private renderRoster(): void {
    this.rosterGrid.innerHTML = CHARACTER_DEFINITIONS.map(
      (character) => `
        <button class="character-card" type="button" data-character-id="${character.id}" style="--char-color:${character.cssColor};--char-aura:${character.auraCss}" aria-label="选择${character.name}">
          <span class="character-card-portrait" aria-hidden="true"><i></i><em>立绘占位</em></span>
          <span class="character-card-copy">
            <small>${character.title}</small>
            <strong>${character.name}</strong>
            <span>${character.weaponName}</span>
          </span>
        </button>`,
    ).join("");

    for (const card of this.rosterGrid.querySelectorAll<HTMLButtonElement>("[data-character-id]")) {
      card.addEventListener("click", () => {
        const id = card.dataset.characterId as CharacterId | undefined;
        if (id) this.selectCharacter(id);
      });
    }
  }

  private selectCharacter(id: CharacterId, persist = true): void {
    this.selectedCharacterId = id;
    if (persist) localStorage.setItem(CHARACTER_KEY, id);
    const character = getCharacter(id);
    document.body.style.setProperty("--selected-character", character.cssColor);
    for (const card of this.rosterGrid.querySelectorAll<HTMLButtonElement>("[data-character-id]")) {
      card.classList.toggle("is-selected", card.dataset.characterId === id);
    }
    this.renderCharacterDetail(character);
  }

  private renderCharacterDetail(character: CharacterDefinition): void {
    const routes = character.uniqueUpgradeIds
      .map((upgradeId) => getUpgradePreview(upgradeId))
      .filter((preview): preview is NonNullable<typeof preview> => Boolean(preview));
    this.characterDetail.innerHTML = `
      <div class="detail-portrait" style="--char-color:${character.cssColor};--char-aura:${character.auraCss}">
        <span class="detail-silhouette" aria-hidden="true"></span>
        <em>NOVELAI 立绘占位</em>
      </div>
      <div class="detail-copy">
        <p class="overline">${character.title} / ${character.weaponName}</p>
        <h2>${character.name}</h2>
        <p class="detail-tagline">${character.tagline}</p>
        <div class="detail-rule">
          <span>武器被动</span>
          <p>${character.passive}</p>
        </div>
        <div class="detail-rule">
          <span>主动技能 · SPACE</span>
          <p><b>${character.skillName}</b> ${character.skillDescription} <em>${character.skillCooldown} 秒冷却</em></p>
        </div>
        <div class="route-chips">
          <span>专属路线</span>
          ${routes.map((route) => `<b>${route.name}</b>`).join("")}
        </div>
      </div>`;
  }

  private syncDisplayModeButtons(): void {
    const mode = (localStorage.getItem(DISPLAY_MODE_KEY) as DisplayMode | null) ?? "auto";
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-display-mode]")) {
      button.classList.toggle("is-selected", button.dataset.displayMode === mode);
    }
  }

  private bindStaticEvents(): void {
    this.query<HTMLButtonElement>("#start-button").addEventListener("click", () => this.openCharacterSelect());
    this.query<HTMLButtonElement>("#character-start").addEventListener("click", () => {
      this.handlers?.onStart(this.selectedCharacterId);
    });
    this.query<HTMLButtonElement>("#character-back").addEventListener("click", () => this.closeCharacterSelect());
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
    this.skillButton.addEventListener("click", () => this.handlers?.onSkill());

    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-display-mode]")) {
      button.addEventListener("click", () => {
        const mode = button.dataset.displayMode as DisplayMode;
        if (mode === ((localStorage.getItem(DISPLAY_MODE_KEY) as DisplayMode | null) ?? "auto")) return;
        localStorage.setItem(DISPLAY_MODE_KEY, mode);
        window.location.reload();
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;

      if (this.characterSelectOpen) {
        if (event.key === "Enter") {
          event.preventDefault();
          this.handlers?.onStart(this.selectedCharacterId);
        } else if (event.key === "Escape") {
          event.preventDefault();
          this.closeCharacterSelect();
        }
        return;
      }

      if (!this.startScreen.classList.contains("is-hidden") && this.helpScreen.classList.contains("is-hidden") && event.key === "Enter") {
        event.preventDefault();
        this.openCharacterSelect();
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

      if (event.code === "Space" && this.currentPhase === "running") {
        event.preventDefault();
        this.handlers?.onSkill();
        return;
      }

      if (event.key === "Escape" || event.key.toLowerCase() === "p") {
        if (this.currentPhase === "paused") this.handlers?.onResume();
        else if (this.started && this.currentPhase === "running") this.handlers?.onPause();
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
