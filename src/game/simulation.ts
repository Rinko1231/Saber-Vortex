export type GamePhase = "menu" | "running" | "paused" | "upgrade" | "gameover" | "victory";

export type EnemyKind = "wisp" | "runner" | "brute" | "boss";

export type Rarity = "common" | "rare" | "epic";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  damage: number;
  attackInterval: number;
  minBlade: number;
  maxBlade: number;
  bladeWidth: number;
  critChance: number;
  critMultiplier: number;
  xpMultiplier: number;
  lifesteal: number;
  slowField: number;
  echoEvery: number;
  echoDamage: number;
}

export interface AimState {
  x: number;
  y: number;
  angle: number;
  previousAngle: number;
  length: number;
  angularSpeed: number;
  targetLength: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  hitCooldown: number;
  touchCooldown: number;
  flash: number;
  phase: number;
  dead: boolean;
}

export interface XpOrb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  age: number;
  dead: boolean;
}

export type EffectKind = "hit" | "crit" | "kill" | "hurt" | "level" | "orb" | "echo";

export interface EffectEvent {
  kind: EffectKind;
  x: number;
  y: number;
  angle?: number;
  color?: string;
  value?: number;
}

export interface BannerState {
  kicker: string;
  title: string;
  remaining: number;
  duration: number;
}

export interface UpgradeOffer {
  id: string;
  name: string;
  description: string;
  flavor: string;
  icon: UpgradeIcon;
  rarity: Rarity;
  currentStacks: number;
  maxStacks: number;
}

export type UpgradeIcon = "reach" | "power" | "speed" | "heart" | "edge" | "star" | "echo" | "ward";

interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  flavor: string;
  icon: UpgradeIcon;
  rarity: Rarity;
  maxStacks: number;
  apply(stats: PlayerStats): void;
}

export interface RunSummary {
  time: number;
  kills: number;
  bestCombo: number;
  level: number;
  victory: boolean;
}

const TAU = Math.PI * 2;
const PLAYER_RADIUS = 26;
const RUN_DURATION = 120;
const BOSS_TIME = 85;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const normalizeAngle = (angle: number): number => {
  let result = angle;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
};

const distancePointToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSquared, 0, 1);
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
};

const angleWithinSweep = (angle: number, from: number, to: number): boolean => {
  const start = normalizeAngle(from);
  const delta = normalizeAngle(to - from);
  const relative = normalizeAngle(angle - start);
  if (delta >= 0) return relative >= 0 && relative <= delta;
  return relative <= 0 && relative >= delta;
};

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const UPGRADES: UpgradeDefinition[] = [
  {
    id: "longer-blade",
    name: "月弦延展",
    description: "光刃最大长度 +70，剑尖覆盖范围更远。",
    flavor: "让月光比敌人先一步抵达。",
    icon: "reach",
    rarity: "common",
    maxStacks: 5,
    apply: (stats) => {
      stats.maxBlade += 70;
    },
  },
  {
    id: "deeper-cut",
    name: "断空",
    description: "基础刃伤 +22%。所有挥砍都会更痛。",
    flavor: "切口安静得像一条没有声音的线。",
    icon: "power",
    rarity: "common",
    maxStacks: 6,
    apply: (stats) => {
      stats.damage *= 1.22;
    },
  },
  {
    id: "quick-draw",
    name: "疾切",
    description: "同一目标的受击间隔 -11%，可更快连续切割。",
    flavor: "不是剑更快，是涡流慢了半拍。",
    icon: "speed",
    rarity: "rare",
    maxStacks: 5,
    apply: (stats) => {
      stats.attackInterval = Math.max(0.055, stats.attackInterval * 0.89);
    },
  },
  {
    id: "moon-ward",
    name: "月蚀加护",
    description: "生命上限 +24，并立刻恢复 32 点生命。",
    flavor: "月亮不替你挡刀，但会替你留住一口气。",
    icon: "heart",
    rarity: "common",
    maxStacks: 6,
    apply: (stats) => {
      stats.maxHp += 24;
      stats.hp = Math.min(stats.maxHp, stats.hp + 32);
    },
  },
  {
    id: "pressure-edge",
    name: "剑压",
    description: "剑身判定宽度 +5，更容易切中高速敌人。",
    flavor: "一道光靠得太近，就会变成一堵墙。",
    icon: "edge",
    rarity: "common",
    maxStacks: 5,
    apply: (stats) => {
      stats.bladeWidth += 5;
    },
  },
  {
    id: "soul-resonance",
    name: "星屑共鸣",
    description: "灵魂获取 +18%，升级来得更快。",
    flavor: "每一颗星屑都记得自己曾属于谁。",
    icon: "star",
    rarity: "rare",
    maxStacks: 5,
    apply: (stats) => {
      stats.xpMultiplier += 0.18;
    },
  },
  {
    id: "eclipse-echo",
    name: "残月回响",
    description: "每斩灭 9 个敌人，释放一次会伤害周围敌人的脉冲。",
    flavor: "剑停下来以后，余波还在继续走。",
    icon: "echo",
    rarity: "epic",
    maxStacks: 4,
    apply: (stats) => {
      stats.echoEvery = stats.echoEvery === 0 ? 9 : Math.max(4, stats.echoEvery - 1);
      stats.echoDamage += 0.65;
    },
  },
  {
    id: "void-siphon",
    name: "虚空汲取",
    description: "每次斩灭恢复 0.7 点生命，首领额外恢复。",
    flavor: "虚空并不饥饿，它只是从不浪费。",
    icon: "ward",
    rarity: "rare",
    maxStacks: 5,
    apply: (stats) => {
      stats.lifesteal += 0.7;
    },
  },
  {
    id: "event-horizon",
    name: "事件视界",
    description: "敌人靠近你时移动速度降低 8%。",
    flavor: "越接近涡心，越难相信自己还在前进。",
    icon: "ward",
    rarity: "rare",
    maxStacks: 4,
    apply: (stats) => {
      stats.slowField = Math.max(0.58, stats.slowField - 0.08);
    },
  },
];

const MOON_EMBER: UpgradeDefinition = {
  id: "moon-ember",
  name: "月蚀余烬",
  description: "恢复 30 点生命。",
  flavor: "涡流允许你再多呼吸一次。",
  icon: "heart",
  rarity: "common",
  maxStacks: 99,
  apply: (stats) => {
    stats.hp = Math.min(stats.maxHp, stats.hp + 30);
  },
};

export class SaberSimulation {
  readonly width: number;
  readonly height: number;
  readonly center: Vec2;
  readonly runDuration = RUN_DURATION;
  readonly bossTime = BOSS_TIME;

  phase: GamePhase = "menu";
  time = 0;
  kills = 0;
  bestCombo = 0;
  level = 1;
  xp = 0;
  xpToNext = 18;
  combo = 0;
  comboTimer = 0;
  bossSpawned = false;
  bossAlive = false;
  stats!: PlayerStats;
  aim!: AimState;
  enemies: Enemy[] = [];
  orbs: XpOrb[] = [];
  effects: EffectEvent[] = [];
  banner: BannerState | null = null;
  upgradeOffers: UpgradeOffer[] = [];
  upgrades: Record<string, number> = {};

  private nextId = 1;
  private spawnTimer = 0;
  private playerInvulnerability = 0;
  private echoCounter = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.center = { x: width / 2, y: height / 2 };
  }

  get wave(): number {
    if (this.time >= BOSS_TIME) return 4;
    if (this.time >= 60) return 3;
    if (this.time >= 30) return 2;
    return 1;
  }

  get waveName(): string {
    if (this.time >= BOSS_TIME) return "终局：虚空女帝";
    if (this.time >= 60) return "第 3 涡流 · 重压";
    if (this.time >= 30) return "第 2 涡流 · 躁动";
    return "第 1 涡流 · 初醒";
  }

  get boss(): Enemy | undefined {
    return this.enemies.find((enemy) => enemy.kind === "boss");
  }

  reset(): void {
    this.phase = "menu";
    this.time = 0;
    this.kills = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 18;
    this.combo = 0;
    this.comboTimer = 0;
    this.bossSpawned = false;
    this.bossAlive = false;
    this.enemies = [];
    this.orbs = [];
    this.effects = [];
    this.banner = null;
    this.upgradeOffers = [];
    this.upgrades = {};
    this.spawnTimer = 0.55;
    this.playerInvulnerability = 0;
    this.echoCounter = 0;
    this.stats = {
      maxHp: 100,
      hp: 100,
      damage: 18,
      attackInterval: 0.17,
      minBlade: 54,
      maxBlade: 420,
      bladeWidth: 13,
      critChance: 0.06,
      critMultiplier: 1.8,
      xpMultiplier: 1,
      lifesteal: 0,
      slowField: 1,
      echoEvery: 0,
      echoDamage: 0,
    };
    this.aim = {
      x: this.center.x,
      y: this.center.y - 170,
      angle: -Math.PI / 2,
      previousAngle: -Math.PI / 2,
      length: 170,
      angularSpeed: 0,
      targetLength: 170,
    };
  }

  start(): void {
    this.reset();
    this.phase = "running";
    this.showBanner("第一涡流 · 初醒", "让剑尖替你思考", 1.8);
  }

  pause(): void {
    if (this.phase === "running") this.phase = "paused";
  }

  resume(): void {
    if (this.phase === "paused") this.phase = "running";
  }

  returnToMenu(): void {
    this.reset();
  }

  drainEffects(): EffectEvent[] {
    if (this.effects.length === 0) return [];
    const drained = this.effects;
    this.effects = [];
    return drained;
  }

  chooseUpgrade(id: string): void {
    if (this.phase !== "upgrade") return;
    const offer = this.upgradeOffers.find((item) => item.id === id);
    const definition = UPGRADES.find((item) => item.id === id) ?? (id === MOON_EMBER.id ? MOON_EMBER : undefined);
    if (!offer || !definition) return;

    this.upgrades[id] = (this.upgrades[id] ?? 0) + 1;
    definition.apply(this.stats);
    this.effects.push({ kind: "level", x: this.center.x, y: this.center.y - 40, color: "#7ef8ff" });
    this.upgradeOffers = [];

    if (this.xp >= this.xpToNext) {
      this.openUpgrade();
      return;
    }

    this.phase = "running";
  }

  update(deltaSeconds: number, pointerX: number, pointerY: number): void {
    const delta = clamp(deltaSeconds, 0, 0.05);

    if (this.banner) {
      this.banner.remaining -= delta;
      if (this.banner.remaining <= 0) this.banner = null;
    }

    if (this.phase !== "running") return;

    this.time = Math.min(this.runDuration, this.time + delta);
    this.playerInvulnerability = Math.max(0, this.playerInvulnerability - delta);
    this.updateAim(delta, pointerX, pointerY);
    this.updateSpawner(delta);
    this.updateEnemies(delta);
    this.updateOrbs(delta);
    this.updateCombo(delta);

    if (this.phase !== "running") return;

    if (this.time >= BOSS_TIME && !this.bossSpawned) {
      this.spawnBoss();
    }

    if (this.stats.hp <= 0) {
      this.phase = "gameover";
      return;
    }

    if (this.time >= this.runDuration) {
      this.phase = "victory";
      this.showBanner("契约完成", "你守住了最后一道月蚀", 2.4);
    }
  }

  private updateAim(delta: number, pointerX: number, pointerY: number): void {
    const angle = Math.atan2(pointerY - this.center.y, pointerX - this.center.x);
    const distance = Math.hypot(pointerX - this.center.x, pointerY - this.center.y);
    const targetLength = clamp(distance, this.stats.minBlade, this.stats.maxBlade);
    const previousAngle = this.aim.angle;
    const angularDelta = normalizeAngle(angle - previousAngle);
    const rawAngularSpeed = Math.abs(angularDelta) / Math.max(delta, 0.001);

    this.aim.previousAngle = previousAngle;
    this.aim.angle = angle;
    this.aim.x = pointerX;
    this.aim.y = pointerY;
    this.aim.targetLength = targetLength;
    this.aim.length = lerp(this.aim.length, targetLength, 1 - Math.exp(-delta * 18));
    this.aim.angularSpeed = lerp(this.aim.angularSpeed, rawAngularSpeed, 1 - Math.exp(-delta * 22));
  }

  private updateSpawner(delta: number): void {
    if (this.enemies.length >= 92) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer > 0) return;

    let rate = 1.05 - this.time * 0.0062;
    if (this.time >= 60) rate *= 0.82;
    if (this.time >= 85) rate *= 1.18;
    if (this.boss) rate *= 1.25;
    this.spawnTimer = Math.max(0.25, rate);

    const count = this.time < 22 ? 1 : this.time < 55 ? (Math.random() < 0.3 ? 2 : 1) : Math.random() < 0.48 ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      this.spawnEnemy(this.pickEnemyKind());
    }
  }

  private pickEnemyKind(): EnemyKind {
    const roll = Math.random();
    if (this.time < 22) return "wisp";
    if (this.time < 42) return roll < 0.69 ? "wisp" : "runner";
    if (this.time < 64) {
      if (roll < 0.48) return "wisp";
      if (roll < 0.82) return "runner";
      return "brute";
    }
    if (this.time < 85) {
      if (roll < 0.28) return "wisp";
      if (roll < 0.68) return "runner";
      return "brute";
    }
    if (roll < 0.18) return "wisp";
    if (roll < 0.62) return "runner";
    return "brute";
  }

  private spawnEnemy(kind: EnemyKind): void {
    const edge = Math.floor(Math.random() * 4);
    const margin = 70;
    let x = margin;
    let y = margin;

    if (edge === 0) {
      x = randomRange(margin, this.width - margin);
      y = -margin;
    } else if (edge === 1) {
      x = this.width + margin;
      y = randomRange(margin, this.height - margin);
    } else if (edge === 2) {
      x = randomRange(margin, this.width - margin);
      y = this.height + margin;
    } else {
      x = -margin;
      y = randomRange(margin, this.height - margin);
    }

    const difficulty = 1 + this.time * 0.0038;
    const preset = {
      wisp: { hp: 24, radius: 15, speed: 55, damage: 8, xp: 1 },
      runner: { hp: 20, radius: 13, speed: 102, damage: 6, xp: 2 },
      brute: { hp: 92, radius: 27, speed: 38, damage: 15, xp: 4 },
      boss: { hp: 2400, radius: 54, speed: 27, damage: 24, xp: 24 },
    }[kind];

    const hp = kind === "boss" ? preset.hp : preset.hp * difficulty;
    this.enemies.push({
      id: this.nextId,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: preset.radius,
      hp,
      maxHp: hp,
      speed: preset.speed * (1 + this.time * 0.0013),
      damage: preset.damage,
      xp: preset.xp,
      hitCooldown: randomRange(0, 0.1),
      touchCooldown: 0.3,
      flash: 0,
      phase: randomRange(0, TAU),
      dead: false,
    });
    this.nextId += 1;
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    this.bossAlive = true;
    const boss = {
      id: this.nextId,
      kind: "boss" as const,
      x: this.center.x,
      y: -130,
      vx: 0,
      vy: 0,
      radius: 54,
      hp: 2400,
      maxHp: 2400,
      speed: 28,
      damage: 24,
      xp: 24,
      hitCooldown: 0.5,
      touchCooldown: 1,
      flash: 0,
      phase: 0,
      dead: false,
    };
    this.enemies.push(boss);
    this.nextId += 1;
    this.effects.push({
      kind: "kill",
      x: this.center.x,
      y: 120,
      color: "#ff82cc",
      value: 0,
    });
    this.showBanner("终局降临", "虚空女帝 · 斫月之瞳", 3);
  }

  private updateEnemies(delta: number): void {
    const bladeWidth = this.stats.bladeWidth;
    const tipX = this.center.x + Math.cos(this.aim.angle) * this.aim.length;
    const tipY = this.center.y + Math.sin(this.aim.angle) * this.aim.length;
    const previousTipX = this.center.x + Math.cos(this.aim.previousAngle) * this.aim.length;
    const previousTipY = this.center.y + Math.sin(this.aim.previousAngle) * this.aim.length;
    const sweepThreshold = this.aim.angularSpeed > 1.35;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.flash = Math.max(0, enemy.flash - delta);
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - delta);
      enemy.touchCooldown = Math.max(0, enemy.touchCooldown - delta);
      enemy.phase += delta * (enemy.kind === "boss" ? 0.55 : 1.3);

      const dx = this.center.x - enemy.x;
      const dy = this.center.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const separation = enemy.radius + PLAYER_RADIUS;
      const slow = distance < 260 ? this.stats.slowField : 1;
      const wobble = enemy.kind === "wisp" ? Math.sin(enemy.phase) * 0.18 : 0;
      const nx = dx / distance;
      const ny = dy / distance;
      const directionX = nx - ny * wobble;
      const directionY = ny + nx * wobble;
      const approach = distance < separation + 30 ? 0.12 : 1;

      enemy.vx = lerp(enemy.vx, directionX * enemy.speed * slow * approach, 1 - Math.exp(-delta * 5.5));
      enemy.vy = lerp(enemy.vy, directionY * enemy.speed * slow * approach, 1 - Math.exp(-delta * 5.5));
      enemy.x += enemy.vx * delta;
      enemy.y += enemy.vy * delta;

      if (distance < separation && enemy.touchCooldown <= 0) {
        this.damagePlayer(enemy.damage);
        enemy.touchCooldown = 0.72;
        enemy.vx -= nx * 100;
        enemy.vy -= ny * 100;
      }

      const distanceToBlade = Math.min(
        distancePointToSegment(enemy.x, enemy.y, this.center.x, this.center.y, tipX, tipY),
        distancePointToSegment(enemy.x, enemy.y, this.center.x, this.center.y, previousTipX, previousTipY),
      );
      const enemyAngle = Math.atan2(enemy.y - this.center.y, enemy.x - this.center.x);
      const radialDistance = Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y);
      const sweptAcross =
        sweepThreshold &&
        radialDistance <= this.aim.length + enemy.radius + bladeWidth &&
        radialDistance >= Math.max(0, this.aim.length * 0.12) &&
        angleWithinSweep(enemyAngle, this.aim.previousAngle, this.aim.angle);
      const intersects = distanceToBlade <= enemy.radius + bladeWidth || sweptAcross;

      if (intersects && enemy.hitCooldown <= 0) {
        this.hitEnemy(enemy, enemyAngle);
      }
    }

    this.separateEnemies();
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.bossAlive = this.enemies.some((enemy) => enemy.kind === "boss");
  }

  private separateEnemies(): void {
    for (let firstIndex = 0; firstIndex < this.enemies.length; firstIndex += 1) {
      const first = this.enemies[firstIndex];
      if (first.dead || first.kind === "boss") continue;
      for (let secondIndex = firstIndex + 1; secondIndex < this.enemies.length; secondIndex += 1) {
        const second = this.enemies[secondIndex];
        if (second.dead) continue;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = (first.radius + second.radius) * 0.72;
        if (distance > 0.001 && distance < minDistance) {
          const push = (minDistance - distance) * 0.5;
          const nx = dx / distance;
          const ny = dy / distance;
          first.x -= nx * push;
          first.y -= ny * push;
          if (second.kind !== "boss") {
            second.x += nx * push;
            second.y += ny * push;
          }
        }
      }
    }
  }

  private hitEnemy(enemy: Enemy, enemyAngle: number): void {
    const speedBonus = 0.88 + Math.min(7.5, this.aim.angularSpeed) * 0.09;
    const critical = Math.random() < this.stats.critChance;
    const damage = this.stats.damage * speedBonus * (critical ? this.stats.critMultiplier : 1);
    enemy.hp -= damage;
    enemy.hitCooldown = this.stats.attackInterval;
    enemy.flash = 0.09;

    const tipDistance = Math.min(this.aim.length, Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y));
    const hitX = this.center.x + Math.cos(enemyAngle) * tipDistance;
    const hitY = this.center.y + Math.sin(enemyAngle) * tipDistance;
    this.effects.push({
      kind: critical ? "crit" : "hit",
      x: hitX,
      y: hitY,
      angle: enemyAngle,
      color: critical ? "#ffd782" : "#7ef8ff",
      value: damage,
    });

    const knockback = enemy.kind === "boss" ? 1.5 : enemy.kind === "brute" ? 8 : 18;
    const nx = Math.cos(enemyAngle);
    const ny = Math.sin(enemyAngle);
    enemy.vx += nx * knockback;
    enemy.vy += ny * knockback;

    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: Enemy): void {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = 2.4;

    if (this.stats.lifesteal > 0) {
      this.stats.hp = Math.min(
        this.stats.maxHp,
        this.stats.hp + this.stats.lifesteal * (enemy.kind === "boss" ? 8 : 1),
      );
    }

    const orbCount = enemy.kind === "boss" ? 9 : enemy.kind === "brute" ? 2 : 1;
    for (let index = 0; index < orbCount; index += 1) {
      const angle = randomRange(0, TAU);
      const speed = randomRange(25, 90);
      this.orbs.push({
        id: this.nextId,
        x: enemy.x + Math.cos(angle) * randomRange(0, enemy.radius * 0.8),
        y: enemy.y + Math.sin(angle) * randomRange(0, enemy.radius * 0.8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        value: enemy.kind === "boss" ? enemy.xp / orbCount : enemy.xp / orbCount,
        age: -index * 0.045,
        dead: false,
      });
      this.nextId += 1;
    }

    this.effects.push({
      kind: "kill",
      x: enemy.x,
      y: enemy.y,
      color: enemy.kind === "boss" ? "#ff82cc" : enemy.kind === "brute" ? "#c4a5ff" : "#9d7bff",
      value: enemy.kind === "boss" ? 1 : 0,
    });

    if (this.stats.echoEvery > 0) {
      this.echoCounter += 1;
      if (this.echoCounter >= this.stats.echoEvery) {
        this.echoCounter = 0;
        this.releaseEcho();
      }
    }

    if (enemy.kind === "boss") {
      this.bossAlive = false;
      this.phase = "victory";
      this.showBanner("终局斩断", "虚空女帝的瞳光熄灭了", 3);
    }
  }

  private releaseEcho(): void {
    const radius = 190;
    const damage = this.stats.damage * (0.7 + this.stats.echoDamage);
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const distance = Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y);
      if (distance <= radius + enemy.radius) {
        enemy.hp -= damage;
        enemy.flash = 0.12;
        if (enemy.hp <= 0) this.killEnemy(enemy);
      }
    }
    this.effects.push({ kind: "echo", x: this.center.x, y: this.center.y, value: radius, color: "#7ef8ff" });
  }

  private damagePlayer(amount: number): void {
    if (this.playerInvulnerability > 0) return;
    this.playerInvulnerability = 0.42;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.combo = 0;
    this.comboTimer = 0;
    this.effects.push({
      kind: "hurt",
      x: this.center.x,
      y: this.center.y,
      value: amount,
      color: "#ff5f86",
    });
  }

  private updateOrbs(delta: number): void {
    for (const orb of this.orbs) {
      if (orb.dead) continue;
      orb.age += delta;
      if (orb.age < 0.2) continue;
      const dx = this.center.x - orb.x;
      const dy = this.center.y - orb.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const pull = 140 + Math.max(0, 620 - distance) * 2.6;
      orb.vx = lerp(orb.vx, (dx / distance) * pull, 1 - Math.exp(-delta * 7));
      orb.vy = lerp(orb.vy, (dy / distance) * pull, 1 - Math.exp(-delta * 7));
      orb.x += orb.vx * delta;
      orb.y += orb.vy * delta;

      if (distance < 36) {
        orb.dead = true;
        this.gainXp(orb.value);
        this.effects.push({ kind: "orb", x: orb.x, y: orb.y, color: "#7ef8ff", value: orb.value });
      }
    }
    this.orbs = this.orbs.filter((orb) => !orb.dead && orb.age < 18);
  }

  private gainXp(amount: number): void {
    this.xp += amount * this.stats.xpMultiplier;
    if (this.xp >= this.xpToNext && this.phase === "running") {
      this.openUpgrade();
    }
  }

  private updateCombo(delta: number): void {
    if (this.combo <= 0) return;
    this.comboTimer -= delta;
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboTimer = 0;
    }
  }

  private openUpgrade(): void {
    this.xp -= this.xpToNext;
    this.level += 1;
    this.xpToNext = Math.round(16 + this.level * 11.5);
    const available = UPGRADES.filter((upgrade) => (this.upgrades[upgrade.id] ?? 0) < upgrade.maxStacks);
    const offers = shuffle(available).slice(0, 3);

    if (offers.length < 3) {
      while (offers.length < 3) offers.push(MOON_EMBER);
    }

    this.upgradeOffers = offers.map((upgrade) => ({
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      flavor: upgrade.flavor,
      icon: upgrade.icon,
      rarity: upgrade.rarity,
      currentStacks: this.upgrades[upgrade.id] ?? 0,
      maxStacks: upgrade.maxStacks,
    }));
    this.phase = "upgrade";
    this.aim.angularSpeed = 0;
  }

  private showBanner(title: string, kicker: string, duration: number): void {
    this.banner = { title, kicker, remaining: duration, duration };
  }
}
