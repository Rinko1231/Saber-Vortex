import {
  CHARACTER_DEFINITIONS,
  getCharacter,
  type CharacterBaseStats,
  type CharacterDefinition,
  type CharacterId,
} from "./characters";

export type GamePhase = "menu" | "running" | "paused" | "upgrade" | "gameover" | "victory";

export type EnemyKind = "wisp" | "runner" | "brute" | "boss";
export type EnemyModifier =
  | "brood"
  | "volatile"
  | "slash_weak"
  | "thrust_weak"
  | "blade_slow"
  | "side_armor";

export type Rarity = "common" | "rare" | "epic";

export type UpgradeIcon =
  | "reach"
  | "power"
  | "speed"
  | "heart"
  | "grace"
  | "star"
  | "echo"
  | "ward"
  | "qi"
  | "dual"
  | "paper"
  | "orb"
  | "thrust"
  | "spin";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerStats extends CharacterBaseStats {
  hp: number;
}

export interface AimState {
  x: number;
  y: number;
  angle: number;
  previousAngle: number;
  length: number;
  targetLength: number;
  angularSpeed: number;
  angularVelocity: number;
  radialSpeed: number;
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
  slowTimer: number;
  slowFactor: number;
  parryTimer: number;
  parryDamage: number;
  modifiers: EnemyModifier[];
  age: number;
  visualScale: number;
  slashVulnerability: number;
  thrustVulnerability: number;
  guardAngle: number;
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

export type ProjectileKind = "qi" | "talisman" | "bolt";
export type ProjectileEffect = "none" | "slow" | "blast" | "drain";

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  pierce: number;
  color: string;
  effect: ProjectileEffect;
  homing: boolean;
  hitIds: Set<number>;
  dead: boolean;
}

interface PendingEcho {
  angle: number;
  length: number;
  delay: number;
  damage: number;
  color: string;
}

interface WeaponRuntime {
  secondaryLength: number;
  lockedPrimary: number | null;
  lockedSecondary: number | null;
  lastDualBlade: 0 | 1 | 2;
  dualAlternateTimer: number;
  qiTimer: number;
  talismanTimer: number;
  thrustChain: number;
  thrustChainTimer: number;
  thrustLockout: number;
  orbX: number;
  orbY: number;
  orbPrevX: number;
  orbPrevY: number;
  orbitPhase: number;
  barrageTimer: number;
  spinCharge: number;
  spinDirection: number;
}

export type EffectKind =
  | "hit"
  | "crit"
  | "kill"
  | "hurt"
  | "level"
  | "orb"
  | "echo"
  | "skill"
  | "thrust"
  | "parry";

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
  scope: "general" | "character";
  characterName: string;
  accent: string;
}

interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  flavor: string;
  icon: UpgradeIcon;
  rarity: Rarity;
  maxStacks: number;
  character?: CharacterId;
  apply(stats: PlayerStats): void;
}

export interface RunSummary {
  time: number;
  kills: number;
  bestCombo: number;
  level: number;
  victory: boolean;
  characterName: string;
}

const TAU = Math.PI * 2;
const PLAYER_RADIUS = 26;
const RUN_DURATION = 120;
const BOSS_TIME = 85;
const MIN_ENEMY_SPEED = 22;
const MIN_HIT_INTERVAL = 0.1;

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

const GENERAL_UPGRADES: UpgradeDefinition[] = [
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
    id: "void-siphon",
    name: "虚空汲取",
    description: "每次斩灭恢复 0.8 点生命。",
    flavor: "虚空并不饥饿，它只是从不浪费。",
    icon: "ward",
    rarity: "rare",
    maxStacks: 5,
    apply: (stats) => {
      stats.lifesteal += 0.8;
    },
  },
  {
    id: "event-horizon",
    name: "事件视界",
    description: "近身敌人减速 7%，最低速度倍率 45%。敌人仍有移动速度下限。",
    flavor: "越接近涡心，越难相信自己还在前进。",
    icon: "ward",
    rarity: "rare",
    maxStacks: 7,
    apply: (stats) => {
      stats.slowField = Math.max(0.45, stats.slowField - 0.07);
    },
  },
  {
    id: "cut-window",
    name: "斩隙校准",
    description: "同一目标受击间隔上限 -0.015 秒，最低 0.10 秒。",
    flavor: "不是每一刀都要更快，只要下一刀更准。",
    icon: "speed",
    rarity: "rare",
    maxStacks: 6,
    apply: (stats) => {
      stats.hitIntervalCap = Math.max(MIN_HIT_INTERVAL, stats.hitIntervalCap - 0.015);
    },
  },
  {
    id: "eclipse-echo",
    name: "残月回响",
    description: "每斩灭 9 个敌人，释放一次范围脉冲。",
    flavor: "剑停下来以后，余波还在继续走。",
    icon: "echo",
    rarity: "epic",
    maxStacks: 4,
    apply: (stats) => {
      stats.echoEvery = stats.echoEvery === 0 ? 9 : Math.max(4, stats.echoEvery - 1);
      stats.echoDamage += 6;
    },
  },
];

const CHARACTER_UPGRADES: UpgradeDefinition[] = [
  {
    id: "qi-count",
    name: "多重剑气",
    description: "每次释放剑气 +1 道，最多 4 道。",
    flavor: "一剑落下，回音分成三份。",
    icon: "qi",
    rarity: "rare",
    maxStacks: 3,
    character: "constella",
    apply: (stats) => {
      stats.qiCount += 1;
    },
  },
  {
    id: "qi-range",
    name: "远轨参数",
    description: "剑气射程 +120，飞行速度提高。",
    flavor: "让剑光越过视线的边界。",
    icon: "reach",
    rarity: "common",
    maxStacks: 4,
    character: "constella",
    apply: (stats) => {
      stats.qiRange += 120;
    },
  },
  {
    id: "qi-mimic",
    name: "拟态协议",
    description: "剑气依次获得减速、爆破、汲取特性。",
    flavor: "她把别人的招式写进了自己的剑里。",
    icon: "star",
    rarity: "epic",
    maxStacks: 3,
    character: "constella",
    apply: (stats) => {
      stats.qiEffectLevel += 1;
    },
  },
  {
    id: "qi-power",
    name: "压缩剑压",
    description: "剑气基础伤害 +6。",
    flavor: "光越细，切得越深。",
    icon: "power",
    rarity: "common",
    maxStacks: 5,
    character: "constella",
    apply: (stats) => {
      stats.qiDamage += 6;
    },
  },
  {
    id: "dual-alternate",
    name: "交刃",
    description: "双刃交替命中额外伤害 +5。",
    flavor: "一长一短，才是完整的一击。",
    icon: "dual",
    rarity: "rare",
    maxStacks: 5,
    character: "moxibai",
    apply: (stats) => {
      stats.dualAlternateBonus += 5;
    },
  },
  {
    id: "dual-balance",
    name: "衡势",
    description: "双刃总长度 +20，短刃更容易触及目标。",
    flavor: "秤的一端落下，另一端便有了风。",
    icon: "reach",
    rarity: "common",
    maxStacks: 4,
    character: "moxibai",
    apply: (stats) => {
      stats.dualLengthBonus += 20;
    },
  },
  {
    id: "dual-core",
    name: "两极剑心",
    description: "双刃基础伤害 +5。",
    flavor: "两端都在问她，哪一边才是正面。",
    icon: "power",
    rarity: "common",
    maxStacks: 5,
    character: "moxibai",
    apply: (stats) => {
      stats.damage += 5;
    },
  },
  {
    id: "dual-tempo",
    name: "回锋步",
    description: "受击间隔上限 -0.015 秒，转向速度 +1。",
    flavor: "脚步不进，剑锋也能先到。",
    icon: "speed",
    rarity: "rare",
    maxStacks: 4,
    character: "moxibai",
    apply: (stats) => {
      stats.hitIntervalCap = Math.max(MIN_HIT_INTERVAL, stats.hitIntervalCap - 0.015);
      stats.turnSpeed += 1;
    },
  },
  {
    id: "talisman-homing",
    name: "追踪符",
    description: "解锁自动追踪符咒，符咒会转向最近敌人。",
    flavor: "纸鹤认得血的味道。",
    icon: "paper",
    rarity: "epic",
    maxStacks: 1,
    character: "yeqingyu",
    apply: (stats) => {
      stats.talismanHoming = true;
    },
  },
  {
    id: "talisman-blast",
    name: "爆裂符",
    description: "解锁爆破符咒，命中后对周围敌人造成 65% 伤害。",
    flavor: "敕令落地，风先炸开。",
    icon: "echo",
    rarity: "rare",
    maxStacks: 1,
    character: "yeqingyu",
    apply: (stats) => {
      stats.talismanBlast = true;
    },
  },
  {
    id: "talisman-drain",
    name: "噬魂符",
    description: "解锁汲取符咒，命中恢复 2 点生命。",
    flavor: "借来的阳气，总要还一点。",
    icon: "ward",
    rarity: "rare",
    maxStacks: 1,
    character: "yeqingyu",
    apply: (stats) => {
      stats.talismanDrain = true;
    },
  },
  {
    id: "talisman-rate",
    name: "连符",
    description: "符咒发射间隔 -0.25 秒，最低 0.8 秒。",
    flavor: "袖口里从来不止一张纸。",
    icon: "speed",
    rarity: "common",
    maxStacks: 5,
    character: "yeqingyu",
    apply: (stats) => {
      stats.talismanInterval = Math.max(0.8, stats.talismanInterval - 0.25);
    },
  },
  {
    id: "sleeve-tip",
    name: "袖里锋",
    description: "袖锋基础伤害 +7。",
    flavor: "最柔软的地方，藏着最薄的一片刃。",
    icon: "power",
    rarity: "common",
    maxStacks: 5,
    character: "yeqingyu",
    apply: (stats) => {
      stats.damage += 7;
    },
  },
  {
    id: "satellite-count",
    name: "卫星增列",
    description: "环绕卫星 +1。",
    flavor: "轨道上又多了一颗不听话的星。",
    icon: "orb",
    rarity: "rare",
    maxStacks: 3,
    character: "lucoco",
    apply: (stats) => {
      stats.satelliteCount += 1;
    },
  },
  {
    id: "satellite-speed",
    name: "加速轨道",
    description: "卫星环绕速度 +0.5 弧度/秒。",
    flavor: "她只是把引力拧紧了一点。",
    icon: "speed",
    rarity: "common",
    maxStacks: 5,
    character: "lucoco",
    apply: (stats) => {
      stats.satelliteOrbitSpeed += 0.5;
    },
  },
  {
    id: "satellite-size",
    name: "星体膨胀",
    description: "卫星体积 +18%，卫星伤害 +4。",
    flavor: "小星星也会长大。",
    icon: "orb",
    rarity: "common",
    maxStacks: 4,
    character: "lucoco",
    apply: (stats) => {
      stats.satelliteSize += 0.18;
      stats.satelliteDamage += 4;
    },
  },
  {
    id: "barrage",
    name: "弹幕协议",
    description: "能量球每 2.2 秒向最近敌人发射一道星弹；重复获得会缩短间隔。",
    flavor: "星星不只会绕圈。",
    icon: "star",
    rarity: "epic",
    maxStacks: 4,
    character: "lucoco",
    apply: (stats) => {
      stats.barrageInterval = stats.barrageInterval === 0 ? 2.2 : Math.max(0.8, stats.barrageInterval - 0.35);
    },
  },
  {
    id: "thrust-damage",
    name: "刺击校准",
    description: "刺击基础伤害 +8。",
    flavor: "一寸长，一寸强；一寸准，寸寸强。",
    icon: "thrust",
    rarity: "common",
    maxStacks: 6,
    character: "araman",
    apply: (stats) => {
      stats.thrustDamage += 8;
    },
  },
  {
    id: "thrust-chain",
    name: "连续刺",
    description: "每层连刺追加伤害 +4。",
    flavor: "第二剑才是回答。",
    icon: "thrust",
    rarity: "rare",
    maxStacks: 5,
    character: "araman",
    apply: (stats) => {
      stats.thrustChainBonus += 4;
    },
  },
  {
    id: "thrust-threshold",
    name: "伸缩机巧",
    description: "刺击所需伸缩速度 -70，最低 280。",
    flavor: "手腕一抖，剑已经回来。",
    icon: "speed",
    rarity: "common",
    maxStacks: 4,
    character: "araman",
    apply: (stats) => {
      stats.thrustThreshold = Math.max(280, stats.thrustThreshold - 70);
    },
  },
  {
    id: "echo-power",
    name: "残影重锋",
    description: "双刀流残影伤害 +18% 基础刺击伤害。",
    flavor: "她离开以后，剑才追上她。",
    icon: "echo",
    rarity: "epic",
    maxStacks: 4,
    character: "araman",
    apply: (stats) => {
      stats.echoStrikeScale = Math.min(1.5, stats.echoStrikeScale + 0.18);
    },
  },
  {
    id: "spin-gain",
    name: "惯性质心",
    description: "同向旋转的惯性积累速度 +0.18。",
    flavor: "重剑不需要更轻，只需要更久。",
    icon: "spin",
    rarity: "common",
    maxStacks: 4,
    character: "beitangxue",
    apply: (stats) => {
      stats.heavySpinGain += 0.18;
    },
  },
  {
    id: "spin-max",
    name: "霜轮极限",
    description: "惯性上限 +1 层。",
    flavor: "雪地里的轮痕，终于闭合成圆。",
    icon: "spin",
    rarity: "rare",
    maxStacks: 3,
    character: "beitangxue",
    apply: (stats) => {
      stats.heavySpinMax += 1;
    },
  },
  {
    id: "heavy-damage",
    name: "重锋",
    description: "重剑基础伤害 +6。",
    flavor: "不是砍下去，是把空气也压下去。",
    icon: "power",
    rarity: "common",
    maxStacks: 5,
    character: "beitangxue",
    apply: (stats) => {
      stats.damage += 6;
    },
  },
  {
    id: "parry-reach",
    name: "雪盾回响",
    description: "弹反冲击半径 +40，同时提高敌群连锁次数上限。",
    flavor: "她的剑没有动，雪先替她挡住了。",
    icon: "ward",
    rarity: "rare",
    maxStacks: 3,
    character: "beitangxue",
    apply: (stats) => {
      stats.parryReach += 40;
    },
  },
];

const UPGRADES = [...GENERAL_UPGRADES, ...CHARACTER_UPGRADES];

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
  characterId: CharacterId = "constella";
  character: CharacterDefinition = getCharacter("constella");
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
  runtime!: WeaponRuntime;
  enemies: Enemy[] = [];
  orbs: XpOrb[] = [];
  projectiles: Projectile[] = [];
  effects: EffectEvent[] = [];
  banner: BannerState | null = null;
  upgradeOffers: UpgradeOffer[] = [];
  upgrades: Record<string, number> = {};
  skillCooldownRemaining = 0;
  skillCooldownDuration = 18;
  skillActiveRemaining = 0;

  private nextId = 1;
  private spawnTimer = 0;
  private playerInvulnerability = 0;
  private echoCounter = 0;
  private pendingEchoes: PendingEcho[] = [];
  private parryChainBudget = 0;
  private parryPairHits = new Set<string>();
  private weaponSlowTimer = 0;
  private explosionDepth = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.center = { x: width / 2, y: height / 2 };
    this.reset();
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

  get skillReady(): boolean {
    return this.skillCooldownRemaining <= 0;
  }

  get skillCooldownRatio(): number {
    return clamp(1 - this.skillCooldownRemaining / Math.max(0.001, this.skillCooldownDuration), 0, 1);
  }

  reset(characterId: CharacterId = this.characterId): void {
    this.phase = "menu";
    this.characterId = characterId;
    this.character = getCharacter(characterId);
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
    this.projectiles = [];
    this.effects = [];
    this.banner = null;
    this.upgradeOffers = [];
    this.upgrades = {};
    this.spawnTimer = 0.55;
    this.playerInvulnerability = 0;
    this.echoCounter = 0;
    this.pendingEchoes = [];
    this.parryChainBudget = 0;
    this.parryPairHits.clear();
    this.weaponSlowTimer = 0;
    this.explosionDepth = 0;
    this.skillCooldownRemaining = 0;
    this.skillCooldownDuration = this.character.skillCooldown;
    this.skillActiveRemaining = 0;
    this.stats = { ...this.character.baseStats, hp: this.character.baseStats.maxHp };
    const aimDistance = this.character.baseStats.minBlade + 100;
    const aimY = this.center.y - aimDistance;
    this.aim = {
      x: this.center.x,
      y: aimY,
      angle: -Math.PI / 2,
      previousAngle: -Math.PI / 2,
      length: aimDistance,
      targetLength: aimDistance,
      angularSpeed: 0,
      angularVelocity: 0,
      radialSpeed: 0,
    };
    const secondaryLength = clamp(
      this.stats.maxBlade + this.stats.minBlade + this.stats.dualLengthBonus - aimDistance,
      this.stats.minBlade,
      this.stats.maxBlade + this.stats.dualLengthBonus,
    );
    this.runtime = {
      secondaryLength,
      lockedPrimary: null,
      lockedSecondary: null,
      lastDualBlade: 0,
      dualAlternateTimer: 0,
      qiTimer: 1.1,
      talismanTimer: this.stats.talismanInterval,
      thrustChain: 0,
      thrustChainTimer: 0,
      thrustLockout: 0,
      orbX: this.center.x,
      orbY: aimY,
      orbPrevX: this.center.x,
      orbPrevY: aimY,
      orbitPhase: 0,
      barrageTimer: this.stats.barrageInterval,
      spinCharge: 0,
      spinDirection: 0,
    };
  }

  start(characterId: CharacterId = this.characterId): void {
    this.reset(characterId);
    this.phase = "running";
    this.showBanner(`${this.character.name} · ${this.character.weaponName}`, "让剑尖替你思考", 1.9);
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

  activateSkill(): void {
    if (this.phase !== "running" || this.skillCooldownRemaining > 0) return;
    this.skillCooldownRemaining = this.character.skillCooldown;
    this.skillCooldownDuration = this.character.skillCooldown;
    this.skillActiveRemaining = 0;

    switch (this.character.weaponKind) {
      case "lightsaber":
        this.skillActiveRemaining = 6;
        this.runtime.qiTimer = 0;
        break;
      case "twinblade":
        this.skillActiveRemaining = 5;
        this.runtime.lockedPrimary = this.aim.length;
        this.runtime.lockedSecondary = this.runtime.secondaryLength;
        break;
      case "sleeve": {
        this.skillActiveRemaining = 0.8;
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          const distance = Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y);
          if (distance <= 360 + enemy.radius) {
            enemy.slowTimer = Math.max(enemy.slowTimer, 4);
            enemy.slowFactor = Math.min(enemy.slowFactor, 0.45);
            this.damageEnemy(enemy, this.stats.damage * 1.1 + 10, "skill");
          }
        }
        break;
      }
      case "orb":
        this.skillActiveRemaining = 0.9;
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          const dx = this.runtime.orbX - enemy.x;
          const dy = this.runtime.orbY - enemy.y;
          const distance = Math.hypot(dx, dy);
          if (distance <= 310 + enemy.radius) {
            enemy.x += dx * 0.55;
            enemy.y += dy * 0.55;
            enemy.vx += dx * 0.8;
            enemy.vy += dy * 0.8;
            this.damageEnemy(enemy, this.stats.damage * 1.8 + this.stats.orbDamage * 2, "skill");
          }
        }
        break;
      case "rapier":
        this.skillActiveRemaining = 6;
        this.runtime.thrustChain = 0;
        break;
      case "greatsword":
        this.skillActiveRemaining = 0.34;
        this.playerInvulnerability = 0.2;
        break;
    }

    this.effects.push({
      kind: "skill",
      x: this.center.x,
      y: this.center.y,
      color: this.character.cssColor,
      value: this.skillActiveRemaining,
    });
  }

  chooseUpgrade(id: string): void {
    if (this.phase !== "upgrade") return;
    const offer = this.upgradeOffers.find((item) => item.id === id);
    const definition = UPGRADES.find((item) => item.id === id) ?? (id === MOON_EMBER.id ? MOON_EMBER : undefined);
    if (!offer || !definition) return;

    this.upgrades[id] = (this.upgrades[id] ?? 0) + 1;
    definition.apply(this.stats);
    this.effects.push({ kind: "level", x: this.center.x, y: this.center.y - 40, color: this.character.cssColor });
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
    this.weaponSlowTimer = Math.max(0, this.weaponSlowTimer - delta);
    this.skillCooldownRemaining = Math.max(0, this.skillCooldownRemaining - delta);
    this.skillActiveRemaining = Math.max(0, this.skillActiveRemaining - delta);
    if (this.skillActiveRemaining <= 0 && this.character.weaponKind === "twinblade") {
      this.runtime.lockedPrimary = null;
      this.runtime.lockedSecondary = null;
    }

    this.updateAim(delta, pointerX, pointerY);
    this.updateWeapon(delta);
    this.updateSpawner(delta);
    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updateEchoes(delta);
    this.updateOrbs(delta);
    this.updateCombo(delta);

    if (this.phase !== "running") return;
    if (this.time >= BOSS_TIME && !this.bossSpawned) this.spawnBoss();
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
    const dx = pointerX - this.center.x;
    const dy = pointerY - this.center.y;
    const desiredAngle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);
    let targetLength = clamp(distance, this.stats.minBlade, this.stats.maxBlade);
    if (this.character.weaponKind === "greatsword") targetLength = this.stats.maxBlade;
    if (this.character.weaponKind === "twinblade" && this.runtime.lockedPrimary !== null) {
      targetLength = this.runtime.lockedPrimary;
    }

    let angleDelta = normalizeAngle(desiredAngle - this.aim.angle);
    let turnSpeed = this.stats.turnSpeed * (this.weaponSlowTimer > 0 ? 0.42 : 1);

    if (this.character.weaponKind === "greatsword") {
      if (Math.abs(angleDelta) > 0.02) {
        const direction = Math.sign(angleDelta);
        if (direction === this.runtime.spinDirection) {
          this.runtime.spinCharge = Math.min(
            this.stats.heavySpinMax,
            this.runtime.spinCharge + delta * this.stats.heavySpinGain * (0.65 + Math.min(1.1, Math.abs(angleDelta) * 3)),
          );
        } else {
          this.runtime.spinDirection = direction;
          this.runtime.spinCharge = Math.max(0, this.runtime.spinCharge - delta * 2.5);
        }
      } else {
        this.runtime.spinCharge = Math.max(0, this.runtime.spinCharge - delta * 0.12);
      }
      turnSpeed += this.runtime.spinCharge * 0.55;
    }

    const maxTurn = turnSpeed * delta;
    angleDelta = clamp(angleDelta, -maxTurn, maxTurn);
    const previousAngle = this.aim.angle;
    this.aim.previousAngle = previousAngle;
    this.aim.angle = normalizeAngle(previousAngle + angleDelta);
    this.aim.angularVelocity = angleDelta / Math.max(delta, 0.001);
    this.aim.angularSpeed = Math.abs(this.aim.angularVelocity);
    this.aim.x = pointerX;
    this.aim.y = pointerY;
    this.aim.targetLength = targetLength;

    const previousLength = this.aim.length;
    if (this.character.weaponKind === "twinblade" && this.runtime.lockedSecondary !== null) {
      this.runtime.secondaryLength = this.runtime.lockedSecondary;
      this.aim.length = this.runtime.lockedPrimary ?? this.aim.length;
    } else {
      this.aim.length = lerp(this.aim.length, targetLength, 1 - Math.exp(-delta * 18));
      if (this.character.weaponKind === "twinblade") {
        this.runtime.secondaryLength = clamp(
          this.stats.maxBlade + this.stats.minBlade + this.stats.dualLengthBonus - this.aim.length,
          this.stats.minBlade,
          this.stats.maxBlade + this.stats.dualLengthBonus,
        );
      }
    }
    this.aim.radialSpeed = clamp((this.aim.length - previousLength) / Math.max(delta, 0.001), -3200, 3200);
  }

  private updateWeapon(delta: number): void {
    this.runtime.dualAlternateTimer = Math.max(0, this.runtime.dualAlternateTimer - delta);
    this.runtime.thrustChainTimer = Math.max(0, this.runtime.thrustChainTimer - delta);
    this.runtime.thrustLockout = Math.max(0, this.runtime.thrustLockout - delta);
    if (this.runtime.thrustChainTimer <= 0) this.runtime.thrustChain = 0;

    const weaponSpeed = this.aim.angularSpeed * this.aim.length;
    if (this.character.weaponKind === "lightsaber") {
      this.runtime.qiTimer = Math.max(0, this.runtime.qiTimer - delta);
      const interval = this.skillActiveRemaining > 0 ? 0.28 : 1.18;
      if (weaponSpeed >= this.stats.minCutSpeed && this.runtime.qiTimer <= 0) {
        this.fireQi();
        this.runtime.qiTimer = interval;
      }
    }

    if (this.character.weaponKind === "sleeve" && this.stats.talismanInterval > 0) {
      this.runtime.talismanTimer -= delta;
      if (this.runtime.talismanTimer <= 0) {
        this.fireTalismans();
        this.runtime.talismanTimer = this.stats.talismanInterval;
      }
    }

    if (this.character.weaponKind === "orb") {
      this.runtime.orbPrevX = this.runtime.orbX;
      this.runtime.orbPrevY = this.runtime.orbY;
      const targetX = this.center.x + Math.cos(this.aim.angle) * this.aim.length;
      const targetY = this.center.y + Math.sin(this.aim.angle) * this.aim.length;
      this.runtime.orbX = lerp(this.runtime.orbX, targetX, 1 - Math.exp(-delta * 24));
      this.runtime.orbY = lerp(this.runtime.orbY, targetY, 1 - Math.exp(-delta * 24));
      this.runtime.orbitPhase += this.stats.satelliteOrbitSpeed * delta;

      if (this.stats.barrageInterval > 0) {
        this.runtime.barrageTimer -= delta;
        if (this.runtime.barrageTimer <= 0) {
          this.fireBarrage();
          this.runtime.barrageTimer = this.stats.barrageInterval;
        }
      }
    }
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
    for (let index = 0; index < count; index += 1) this.spawnEnemy(this.pickEnemyKind());
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

    const modifiers = this.rollEnemyModifiers();
    this.spawnEnemyAt(kind, x, y, modifiers);
  }

  private rollEnemyModifiers(): EnemyModifier[] {
    if (this.time < 25) return [];
    const chance = Math.min(0.24, 0.07 + (this.time - 25) * 0.0016);
    if (Math.random() >= chance) return [];
    const pool: EnemyModifier[] = ["brood", "volatile", "slash_weak", "thrust_weak", "blade_slow", "side_armor"];
    return [pool[Math.floor(Math.random() * pool.length)]];
  }

  private spawnEnemyAt(
    kind: EnemyKind,
    x: number,
    y: number,
    modifiers: EnemyModifier[] = [],
    options: { hpScale?: number; radiusScale?: number; visualScale?: number } = {},
  ): void {
    const difficulty = 1 + this.time * 0.0038;
    const preset = {
      wisp: { hp: 24, radius: 14, speed: 55, damage: 8, xp: 1 },
      runner: { hp: 20, radius: 12, speed: 102, damage: 6, xp: 2 },
      brute: { hp: 92, radius: 25, speed: 38, damage: 15, xp: 4 },
      boss: { hp: 2400, radius: 50, speed: 27, damage: 24, xp: 24 },
    }[kind];

    const volatile = modifiers.includes("volatile");
    const hpScale = options.hpScale ?? (volatile ? 2 : modifiers.length > 0 ? 1.22 : 1);
    const radiusScale = options.radiusScale ?? (volatile ? 1.1 : 1);
    const hp = kind === "boss" ? preset.hp : preset.hp * difficulty * hpScale;
    const slashVulnerability = modifiers.includes("slash_weak") ? 1.7 : modifiers.includes("thrust_weak") ? 0.65 : 1;
    const thrustVulnerability = modifiers.includes("thrust_weak") ? 1.8 : modifiers.includes("slash_weak") ? 0.65 : 1;
    this.enemies.push({
      id: this.nextId,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: preset.radius * radiusScale,
      hp,
      maxHp: hp,
      speed: preset.speed * (1 + this.time * 0.0013) * (volatile ? 0.82 : 1),
      damage: preset.damage,
      xp: preset.xp,
      hitCooldown: randomRange(0, 0.1),
      touchCooldown: 0.3,
      flash: 0,
      phase: randomRange(0, TAU),
      slowTimer: 0,
      slowFactor: 1,
      parryTimer: 0,
      parryDamage: 0,
      modifiers,
      age: 0,
      visualScale: options.visualScale ?? (volatile ? 1.12 : modifiers.length > 0 ? 1.05 : 1),
      slashVulnerability,
      thrustVulnerability,
      guardAngle: randomRange(0, TAU),
      dead: false,
    });
    this.nextId += 1;
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    this.bossAlive = true;
    this.enemies.push({
      id: this.nextId,
      kind: "boss",
      x: this.center.x,
      y: -130,
      vx: 0,
      vy: 0,
      radius: 50,
      hp: 2400,
      maxHp: 2400,
      speed: 28,
      damage: 24,
      xp: 24,
      hitCooldown: 0.5,
      touchCooldown: 1,
      flash: 0,
      phase: 0,
      slowTimer: 0,
      slowFactor: 1,
      parryTimer: 0,
      parryDamage: 0,
      modifiers: [],
      age: 0,
      visualScale: 1,
      slashVulnerability: 1,
      thrustVulnerability: 1,
      guardAngle: 0,
      dead: false,
    });
    this.nextId += 1;
    this.effects.push({ kind: "kill", x: this.center.x, y: 120, color: "#ff82cc", value: 0 });
    this.showBanner("终局降临", "虚空女帝 · 斫月之瞳", 3);
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.flash = Math.max(0, enemy.flash - delta);
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - delta);
      enemy.touchCooldown = Math.max(0, enemy.touchCooldown - delta);
      enemy.phase += delta * (enemy.kind === "boss" ? 0.55 : 1.3);
      enemy.age += delta;
      enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
      enemy.parryTimer = Math.max(0, enemy.parryTimer - delta);

      if (enemy.parryTimer > 0) {
        enemy.x += enemy.vx * delta;
        enemy.y += enemy.vy * delta;
        enemy.vx *= Math.exp(-delta * 1.5);
        enemy.vy *= Math.exp(-delta * 1.5);
        continue;
      }

      const dx = this.center.x - enemy.x;
      const dy = this.center.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const separation = enemy.radius + PLAYER_RADIUS;
      const fieldSlow = distance < 260 ? Math.max(this.stats.slowField, this.stats.slowFloor) : 1;
      const statusSlow = enemy.slowTimer > 0 ? enemy.slowFactor : 1;
      const moveSpeed = Math.max(MIN_ENEMY_SPEED, enemy.speed * fieldSlow * statusSlow);
      const wobble = enemy.kind === "wisp" ? Math.sin(enemy.phase) * 0.18 : 0;
      const nx = dx / distance;
      const ny = dy / distance;
      const directionX = nx - ny * wobble;
      const directionY = ny + nx * wobble;
      const approach = distance < separation + 30 ? 0.12 : 1;

      enemy.vx = lerp(enemy.vx, directionX * moveSpeed * approach, 1 - Math.exp(-delta * 5.5));
      enemy.vy = lerp(enemy.vy, directionY * moveSpeed * approach, 1 - Math.exp(-delta * 5.5));
      enemy.x += enemy.vx * delta;
      enemy.y += enemy.vy * delta;

      if (distance < separation && enemy.touchCooldown <= 0) {
        this.damagePlayer(enemy.damage);
        enemy.touchCooldown = 0.72;
        enemy.vx -= nx * 100;
        enemy.vy -= ny * 100;
      }

      this.checkWeaponHit(enemy);
    }

    this.separateEnemies();
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.bossAlive = this.enemies.some((enemy) => enemy.kind === "boss");
  }

  private checkWeaponHit(enemy: Enemy): void {
    if (enemy.dead) return;
    const kind = this.character.weaponKind;

    if (kind === "greatsword" && this.skillActiveRemaining > 0) {
      const tipX = this.center.x + Math.cos(this.aim.angle) * this.aim.length;
      const tipY = this.center.y + Math.sin(this.aim.angle) * this.aim.length;
      const previousTipX = this.center.x + Math.cos(this.aim.previousAngle) * this.aim.length;
      const previousTipY = this.center.y + Math.sin(this.aim.previousAngle) * this.aim.length;
      const bladeDistance = Math.min(
        distancePointToSegment(enemy.x, enemy.y, this.center.x, this.center.y, tipX, tipY),
        distancePointToSegment(enemy.x, enemy.y, this.center.x, this.center.y, previousTipX, previousTipY),
      );
      if (bladeDistance <= enemy.radius + this.stats.bladeWidth) {
        const dx = enemy.x - this.center.x;
        const dy = enemy.y - this.center.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const nx = dx / distance;
        const ny = dy / distance;
        const parryDamage = this.stats.damage * 2.4 + 18;
        this.weaponHit(enemy, parryDamage, 420, enemy.x, enemy.y, "parry");
        enemy.hitCooldown = 0.45;
        if (!enemy.dead) {
          enemy.vx = nx * 540;
          enemy.vy = ny * 540;
          enemy.parryTimer = 0.85;
          enemy.parryDamage = parryDamage * 0.75;
        }
        this.parryChainBudget = 2 + Math.floor(this.stats.parryReach / 100);
        this.parryPairHits.clear();
        this.effects.push({
          kind: "parry",
          x: enemy.x,
          y: enemy.y,
          color: this.character.cssColor,
          value: this.stats.parryReach,
        });
        this.skillActiveRemaining = 0;
        return;
      }
    }

    if (enemy.hitCooldown > 0) return;

    if (kind === "orb") {
      this.checkOrbHit(enemy);
      return;
    }

    const radialDistance = Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y);
    const enemyAngle = Math.atan2(enemy.y - this.center.y, enemy.x - this.center.x);

    if (kind === "twinblade") {
      this.checkBladeSegment(enemy, this.aim.previousAngle, this.aim.angle, this.aim.length, 0, radialDistance, enemyAngle);
      if (!enemy.dead && enemy.hitCooldown <= 0) {
        this.checkBladeSegment(
          enemy,
          this.aim.previousAngle + Math.PI,
          this.aim.angle + Math.PI,
          this.runtime.secondaryLength,
          1,
          radialDistance,
          enemyAngle,
        );
      }
      return;
    }

    if (kind === "sleeve") {
      this.checkBladeSegment(enemy, this.aim.previousAngle, this.aim.angle, this.aim.length, 0, radialDistance, enemyAngle, 0.68);
      return;
    }

    this.checkBladeSegment(enemy, this.aim.previousAngle, this.aim.angle, this.aim.length, 0, radialDistance, enemyAngle);
  }

  private checkBladeSegment(
    enemy: Enemy,
    previousAngle: number,
    angle: number,
    length: number,
    bladeIndex: 0 | 1,
    radialDistance: number,
    enemyAngle: number,
    innerRatio = 0,
  ): void {
    if (enemy.dead || enemy.hitCooldown > 0) return;
    const startRadius = length * innerRatio;
    const startX = this.center.x + Math.cos(angle) * startRadius;
    const startY = this.center.y + Math.sin(angle) * startRadius;
    const tipX = this.center.x + Math.cos(angle) * length;
    const tipY = this.center.y + Math.sin(angle) * length;
    const previousTipX = this.center.x + Math.cos(previousAngle) * length;
    const previousTipY = this.center.y + Math.sin(previousAngle) * length;
    const previousStartX = this.center.x + Math.cos(previousAngle) * startRadius;
    const previousStartY = this.center.y + Math.sin(previousAngle) * startRadius;
    const distanceToBlade = Math.min(
      distancePointToSegment(enemy.x, enemy.y, startX, startY, tipX, tipY),
      distancePointToSegment(enemy.x, enemy.y, previousStartX, previousStartY, previousTipX, previousTipY),
    );
    const contactRadius = clamp(radialDistance, 20, length);
    const tangentialSpeed = Math.abs(this.aim.angularVelocity * contactRadius);
    const axialSpeed = Math.abs(this.aim.radialSpeed);
    const totalSpeed = Math.hypot(tangentialSpeed, axialSpeed);
    const sweptAcross =
      this.aim.angularSpeed > 0.5 &&
      radialDistance >= startRadius - enemy.radius &&
      radialDistance <= length + enemy.radius + this.stats.bladeWidth &&
      angleWithinSweep(enemyAngle, previousAngle, angle);
    const intersects = distanceToBlade <= enemy.radius + this.stats.bladeWidth || sweptAcross;
    if (intersects && enemy.modifiers.includes("blade_slow")) {
      this.weaponSlowTimer = Math.max(this.weaponSlowTimer, 0.42);
    }
    if (!intersects || totalSpeed < this.stats.minCutSpeed) return;

    const slashShare = totalSpeed > 0 ? tangentialSpeed / totalSpeed : 0;
    const thrustShare = totalSpeed > 0 ? axialSpeed / totalSpeed : 0;
    const typeCoefficient =
      slashShare * this.stats.slashCoefficient + thrustShare * this.stats.thrustCoefficient;
    const thrustDominant = thrustShare >= 0.52 && axialSpeed >= this.stats.thrustThreshold;
    let damage =
      this.stats.damage * typeCoefficient +
      this.stats.speedDamage * clamp(totalSpeed / 120, 0, 6) +
      this.stats.thrustDamage * thrustShare;
    if (this.character.weaponKind === "twinblade") {
      const lengthFactor =
        this.skillActiveRemaining > 0
          ? 1
          : clamp((this.stats.maxBlade + this.stats.minBlade) / (length + 60), 0.55, 1.8);
      damage *= lengthFactor;
      if (this.runtime.dualAlternateTimer > 0 && this.runtime.lastDualBlade !== 0 && this.runtime.lastDualBlade !== bladeIndex + 1) {
        damage += this.stats.dualAlternateBonus;
        this.effects.push({
          kind: "crit",
          x: enemy.x,
          y: enemy.y,
          angle: this.aim.angle,
          color: "#ffd782",
          value: this.stats.dualAlternateBonus,
        });
      }
      this.runtime.lastDualBlade = (bladeIndex + 1) as 1 | 2;
      this.runtime.dualAlternateTimer = 1.25;
    }

    if (this.character.weaponKind === "greatsword") {
      damage *= 1 + this.runtime.spinCharge * this.stats.heavySpinScale;
    }

    const hitX = this.center.x + Math.cos(enemyAngle) * Math.min(length, radialDistance);
    const hitY = this.center.y + Math.sin(enemyAngle) * Math.min(length, radialDistance);
    damage *= slashShare * enemy.slashVulnerability + thrustShare * enemy.thrustVulnerability;
    if (enemy.modifiers.includes("side_armor")) {
      const contactAngle = Math.atan2(hitY - enemy.y, hitX - enemy.x);
      const guardDifference = Math.abs(normalizeAngle(contactAngle - enemy.guardAngle));
      damage *= guardDifference < Math.PI / 2 ? 0.52 : 1.7;
    }

    if (thrustDominant && this.runtime.thrustLockout <= 0) {
      damage += this.runtime.thrustChain * this.stats.thrustChainBonus;
      this.runtime.thrustChain = Math.min(5, this.runtime.thrustChain + 1);
      this.runtime.thrustChainTimer = 1.4;
      this.runtime.thrustLockout = 0.18;
      this.effects.push({
        kind: "thrust",
        x: enemy.x,
        y: enemy.y,
        angle: this.aim.angle,
        color: this.character.cssColor,
        value: this.runtime.thrustChain,
      });
      if (this.skillActiveRemaining > 0) {
        this.pendingEchoes.push({
          angle: this.aim.angle,
          length: this.aim.length,
          delay: 0.18,
          damage: damage * this.stats.echoStrikeScale,
          color: this.character.cssColor,
        });
      }
    }
    this.weaponHit(enemy, damage, totalSpeed, hitX, hitY, thrustDominant ? "thrust" : "blade");
    enemy.hitCooldown = clamp((enemy.radius * 2.4) / Math.max(1, totalSpeed), MIN_HIT_INTERVAL, this.stats.hitIntervalCap);
  }

  private checkOrbHit(enemy: Enemy): void {
    const orbDistance = Math.hypot(enemy.x - this.runtime.orbX, enemy.y - this.runtime.orbY);
    const orbSpeed = Math.hypot(
      this.runtime.orbX - this.runtime.orbPrevX,
      this.runtime.orbY - this.runtime.orbPrevY,
    ) / 0.016;
    if (orbDistance <= this.stats.orbRadius + enemy.radius && orbSpeed >= this.stats.minCutSpeed) {
      const damage = this.stats.orbDamage + this.stats.damage + this.stats.speedDamage * clamp(orbSpeed / 300, 0, 3);
      this.weaponHit(enemy, damage, orbSpeed, this.runtime.orbX, this.runtime.orbY, "orb");
      enemy.hitCooldown = clamp((enemy.radius * 2.2) / Math.max(1, orbSpeed), MIN_HIT_INTERVAL, this.stats.hitIntervalCap);
      return;
    }

    const satelliteSpeed = this.stats.satelliteOrbitSpeed * this.stats.satelliteRadius;
    for (let index = 0; index < this.stats.satelliteCount; index += 1) {
      const satelliteAngle = this.runtime.orbitPhase + (index / this.stats.satelliteCount) * TAU;
      const sx = this.runtime.orbX + Math.cos(satelliteAngle) * this.stats.satelliteRadius;
      const sy = this.runtime.orbY + Math.sin(satelliteAngle) * this.stats.satelliteRadius;
      const distance = Math.hypot(enemy.x - sx, enemy.y - sy);
      if (distance <= enemy.radius + 12 * this.stats.satelliteSize && satelliteSpeed >= this.stats.minCutSpeed) {
        const damage =
          this.stats.satelliteDamage +
          this.stats.speedDamage * clamp(satelliteSpeed / 140, 0, 3);
        this.weaponHit(enemy, damage, satelliteSpeed, sx, sy, "orb");
        enemy.hitCooldown = clamp((enemy.radius * 2.2) / Math.max(1, satelliteSpeed), MIN_HIT_INTERVAL, this.stats.hitIntervalCap);
        return;
      }
    }
  }

  private weaponHit(
    enemy: Enemy,
    rawDamage: number,
    speed: number,
    x: number,
    y: number,
    kind: "blade" | "thrust" | "orb" | "parry" | "projectile",
  ): void {
    const critical = kind !== "projectile" && Math.random() < this.stats.critChance;
    const damage = rawDamage * (critical ? this.stats.critMultiplier : 1);
    enemy.hp -= damage;
    enemy.flash = 0.09;
    const color = critical ? "#ffd782" : this.character.cssColor;
    this.effects.push({
      kind: critical ? "crit" : kind === "thrust" ? "thrust" : "hit",
      x,
      y,
      angle: Math.atan2(y - this.center.y, x - this.center.x),
      color,
      value: damage + speed * 0.01,
    });
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private damageEnemy(enemy: Enemy, amount: number, kind: "projectile" | "skill" = "projectile"): void {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 0.08;
    this.effects.push({
      kind: "hit",
      x: enemy.x,
      y: enemy.y,
      color: kind === "skill" ? this.character.cssColor : "#bafcff",
      value: amount,
    });
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private fireQi(): void {
    const count = Math.max(1, this.stats.qiCount + (this.skillActiveRemaining > 0 ? 1 : 0));
    const effects: ProjectileEffect[] = ["slow", "blast", "drain"];
    const effect =
      this.stats.qiEffectLevel > 0
        ? effects[Math.min(effects.length - 1, Math.floor(Math.random() * this.stats.qiEffectLevel))]
        : "none";
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * 0.32;
      this.spawnProjectile({
        kind: "qi",
        angle: this.aim.angle + offset,
        speed: 620,
        damage: this.stats.qiDamage + this.stats.damage * 0.35,
        radius: 14,
        life: this.stats.qiRange / 620,
        pierce: 1,
        color: this.character.cssColor,
        effect,
        homing: false,
      });
    }
    this.effects.push({
      kind: "skill",
      x: this.center.x,
      y: this.center.y,
      angle: this.aim.angle,
      color: this.character.cssColor,
      value: 0.25,
    });
  }

  private fireTalismans(): void {
    const effects: ProjectileEffect[] = [];
    if (this.stats.talismanSlow) effects.push("slow");
    if (this.stats.talismanBlast) effects.push("blast");
    if (this.stats.talismanDrain) effects.push("drain");
    if (effects.length === 0) effects.push("none");
    const homing = this.stats.talismanHoming;
    for (let index = 0; index < Math.max(1, this.stats.talismanCount); index += 1) {
      const offset = this.stats.talismanCount <= 1 ? 0 : (index - (this.stats.talismanCount - 1) / 2) * 0.16;
      this.spawnProjectile({
        kind: "talisman",
        angle: this.aim.angle + offset,
        speed: 330,
        damage: this.stats.talismanDamage + this.stats.damage * 0.3,
        radius: 10,
        life: 2.2,
        pierce: 0,
        color: "#eaffc2",
        effect: effects[Math.floor(Math.random() * effects.length)],
        homing,
      });
    }
  }

  private fireBarrage(): void {
    const target = this.nearestEnemy(this.runtime.orbX, this.runtime.orbY, 700);
    const angle = target
      ? Math.atan2(target.y - this.runtime.orbY, target.x - this.runtime.orbX)
      : this.aim.angle;
    this.spawnProjectile({
      kind: "bolt",
      angle,
      speed: 450,
      damage: this.stats.satelliteDamage * 0.8 + this.stats.damage * 0.2,
      radius: 8,
      life: 2,
      pierce: 0,
      color: this.character.cssColor,
      effect: "none",
      homing: false,
    });
  }

  private spawnProjectile(options: {
    kind: ProjectileKind;
    angle: number;
    speed: number;
    damage: number;
    radius: number;
    life: number;
    pierce: number;
    color: string;
    effect: ProjectileEffect;
    homing: boolean;
  }): void {
    const origin = options.kind === "bolt" ? { x: this.runtime.orbX, y: this.runtime.orbY } : { x: this.center.x, y: this.center.y };
    this.projectiles.push({
      id: this.nextId,
      kind: options.kind,
      x: origin.x + Math.cos(options.angle) * 34,
      y: origin.y + Math.sin(options.angle) * 34,
      vx: Math.cos(options.angle) * options.speed,
      vy: Math.sin(options.angle) * options.speed,
      radius: options.radius,
      damage: options.damage,
      life: options.life,
      maxLife: options.life,
      pierce: options.pierce,
      color: options.color,
      effect: options.effect,
      homing: options.homing,
      hitIds: new Set<number>(),
      dead: false,
    });
    this.nextId += 1;
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      projectile.life -= delta;
      if (projectile.life <= 0) {
        projectile.dead = true;
        continue;
      }
      if (projectile.homing) {
        const target = this.nearestEnemy(projectile.x, projectile.y, 600);
        if (target) {
          const desired = Math.atan2(target.y - projectile.y, target.x - projectile.x);
          const current = Math.atan2(projectile.vy, projectile.vx);
          const next = current + clamp(normalizeAngle(desired - current), -delta * 5, delta * 5);
          const speed = Math.hypot(projectile.vx, projectile.vy);
          projectile.vx = Math.cos(next) * speed;
          projectile.vy = Math.sin(next) * speed;
        }
      }
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      if (
        projectile.x < -120 ||
        projectile.x > this.width + 120 ||
        projectile.y < -120 ||
        projectile.y > this.height + 120
      ) {
        projectile.dead = true;
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.dead || projectile.hitIds.has(enemy.id)) continue;
        if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) > enemy.radius + projectile.radius) continue;
        projectile.hitIds.add(enemy.id);
        this.damageEnemy(enemy, projectile.damage);
        this.applyProjectileEffect(enemy, projectile.effect);
        if (projectile.pierce > 0) projectile.pierce -= 1;
        else projectile.dead = true;
        if (projectile.dead) break;
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
  }

  private applyProjectileEffect(enemy: Enemy, effect: ProjectileEffect): void {
    if (effect === "slow") {
      enemy.slowTimer = Math.max(enemy.slowTimer, 2.5);
      enemy.slowFactor = Math.min(enemy.slowFactor, 0.55);
    } else if (effect === "drain") {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 2);
    } else if (effect === "blast") {
      for (const other of this.enemies) {
        if (other.dead || other.id === enemy.id) continue;
        if (Math.hypot(other.x - enemy.x, other.y - enemy.y) <= 76 + other.radius) {
          this.damageEnemy(other, this.stats.talismanDamage * 0.65 + this.stats.damage * 0.25);
        }
      }
      this.effects.push({ kind: "echo", x: enemy.x, y: enemy.y, value: 76, color: "#ffd782" });
    }
  }

  private updateEchoes(delta: number): void {
    for (const echo of this.pendingEchoes) {
      echo.delay -= delta;
      if (echo.delay > 0) continue;
      const tipX = this.center.x + Math.cos(echo.angle) * echo.length;
      const tipY = this.center.y + Math.sin(echo.angle) * echo.length;
      const hits = this.enemies
        .filter(
          (enemy) =>
            !enemy.dead &&
            distancePointToSegment(enemy.x, enemy.y, this.center.x, this.center.y, tipX, tipY) <=
              enemy.radius + this.stats.bladeWidth,
        )
        .slice(0, 3);
      for (const enemy of hits) this.damageEnemy(enemy, echo.damage, "skill");
      echo.delay = 999;
      this.effects.push({
        kind: "thrust",
        x: tipX,
        y: tipY,
        angle: echo.angle,
        color: echo.color,
        value: echo.damage,
      });
    }
    this.pendingEchoes = this.pendingEchoes.filter((echo) => echo.delay < 900);
  }

  private releaseEcho(): void {
    const radius = 190;
    const damage = this.stats.echoDamage + this.stats.damage * 0.55;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y) <= radius + enemy.radius) {
        this.damageEnemy(enemy, damage, "skill");
      }
    }
    this.effects.push({ kind: "echo", x: this.center.x, y: this.center.y, value: radius, color: "#7ef8ff" });
  }

  private nearestEnemy(x: number, y: number, maxDistance: number): Enemy | undefined {
    let best: Enemy | undefined;
    let bestDistance = maxDistance;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    return best;
  }

  private killEnemy(enemy: Enemy): void {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = 2.4;
    if (this.stats.lifesteal > 0) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.lifesteal * (enemy.kind === "boss" ? 8 : 1));
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
        value: enemy.xp / orbCount,
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

    if (enemy.modifiers.includes("brood") && enemy.age < 5 && enemy.kind !== "boss") {
      for (let index = 0; index < 3; index += 1) {
        const angle = randomRange(0, TAU);
        this.spawnEnemyAt(
          "wisp",
          enemy.x + Math.cos(angle) * randomRange(8, 34),
          enemy.y + Math.sin(angle) * randomRange(8, 34),
          [],
          { hpScale: 0.55, radiusScale: 0.72, visualScale: 0.72 },
        );
      }
      this.effects.push({ kind: "echo", x: enemy.x, y: enemy.y, value: 72, color: "#8dffd2" });
    }
    if (enemy.modifiers.includes("volatile")) this.explodeVolatile(enemy);

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

  private explodeVolatile(enemy: Enemy): void {
    const radius = 170;
    this.effects.push({ kind: "skill", x: enemy.x, y: enemy.y, color: "#ff8f5e", value: radius });
    if (Math.hypot(enemy.x - this.center.x, enemy.y - this.center.y) <= radius + PLAYER_RADIUS) {
      this.damagePlayer(16);
    }
    if (this.explosionDepth >= 2) return;
    this.explosionDepth += 1;
    for (const other of this.enemies) {
      if (other.dead || other.id === enemy.id) continue;
      const dx = other.x - enemy.x;
      const dy = other.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance > radius + other.radius) continue;
      const nx = dx / Math.max(1, distance);
      const ny = dy / Math.max(1, distance);
      other.vx += nx * 180;
      other.vy += ny * 180;
      this.damageEnemy(other, 24 + this.stats.damage * 0.45, "skill");
    }
    this.explosionDepth -= 1;
  }

  private damagePlayer(amount: number): void {
    if (this.playerInvulnerability > 0) return;
    this.playerInvulnerability = 0.42;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.combo = 0;
    this.comboTimer = 0;
    this.effects.push({ kind: "hurt", x: this.center.x, y: this.center.y, value: amount, color: "#ff5f86" });
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
    if (this.xp >= this.xpToNext && this.phase === "running") this.openUpgrade();
  }

  private updateCombo(delta: number): void {
    if (this.combo <= 0) return;
    this.comboTimer -= delta;
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboTimer = 0;
    }
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
          const pairKey = `${first.id}:${second.id}`;
          if (
            (first.parryTimer > 0 || second.parryTimer > 0) &&
            this.parryChainBudget > 0 &&
            !this.parryPairHits.has(pairKey)
          ) {
            this.parryPairHits.add(pairKey);
            this.parryChainBudget -= 1;
            const source = first.parryTimer > 0 ? first : second;
            const target = source === first ? second : first;
            const chainDamage = source.parryDamage * 0.7;
            const targetDx = target.x - source.x;
            const targetDy = target.y - source.y;
            const targetDistance = Math.max(1, Math.hypot(targetDx, targetDy));
            this.damageEnemy(target, chainDamage, "skill");
            if (!target.dead && target.kind !== "boss") {
              target.vx = (targetDx / targetDistance) * 430;
              target.vy = (targetDy / targetDistance) * 430;
              target.parryTimer = 0.55;
              target.parryDamage = chainDamage * 0.65;
            }
            this.effects.push({
              kind: "parry",
              x: (first.x + second.x) / 2,
              y: (first.y + second.y) / 2,
              color: this.character.cssColor,
              value: 70,
            });
          }
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

  private openUpgrade(): void {
    this.xp -= this.xpToNext;
    this.level += 1;
    this.xpToNext = Math.round(16 + this.level * 11.5);
    const available = UPGRADES.filter((upgrade) => (this.upgrades[upgrade.id] ?? 0) < upgrade.maxStacks);
    const unique = shuffle(available.filter((upgrade) => upgrade.character === this.characterId)).slice(0, 2);
    const general = shuffle(available.filter((upgrade) => !upgrade.character)).slice(0, 2);
    const offers: UpgradeDefinition[] = [];
    for (const upgrade of [...unique, ...general]) {
      if (offers.length >= 3) break;
      if (!offers.some((item) => item.id === upgrade.id)) offers.push(upgrade);
    }
    if (offers.length < 3) {
      for (const upgrade of shuffle(available)) {
        if (!offers.some((item) => item.id === upgrade.id)) offers.push(upgrade);
        if (offers.length >= 3) break;
      }
    }
    while (offers.length < 3) offers.push(MOON_EMBER);

    this.upgradeOffers = shuffle(offers).map((upgrade) => ({
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      flavor: upgrade.flavor,
      icon: upgrade.icon,
      rarity: upgrade.rarity,
      currentStacks: this.upgrades[upgrade.id] ?? 0,
      maxStacks: upgrade.maxStacks,
      scope: upgrade.character ? "character" : "general",
      characterName: this.character.name,
      accent: this.character.cssColor,
    }));
    this.phase = "upgrade";
    this.aim.angularSpeed = 0;
    this.aim.angularVelocity = 0;
  }

  private showBanner(kicker: string, title: string, duration: number): void {
    this.banner = { title, kicker, remaining: duration, duration };
  }
}

export const getUpgradePreview = (
  id: string,
): { name: string; description: string; icon: UpgradeIcon } | undefined => {
  const upgrade = UPGRADES.find((item) => item.id === id);
  return upgrade ? { name: upgrade.name, description: upgrade.description, icon: upgrade.icon } : undefined;
};

export { CHARACTER_DEFINITIONS };
