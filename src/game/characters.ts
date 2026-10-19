export type CharacterId =
  | "constella"
  | "moxibai"
  | "yeqingyu"
  | "lucoco"
  | "araman"
  | "beitangxue";

export type WeaponKind = "lightsaber" | "twinblade" | "sleeve" | "orb" | "rapier" | "greatsword";

export interface CharacterBaseStats {
  maxHp: number;
  damage: number;
  minBlade: number;
  maxBlade: number;
  bladeWidth: number;
  minCutSpeed: number;
  hitIntervalCap: number;
  turnSpeed: number;
  speedDamage: number;
  slashCoefficient: number;
  thrustCoefficient: number;
  critChance: number;
  critMultiplier: number;
  xpMultiplier: number;
  lifesteal: number;
  slowField: number;
  slowFloor: number;
  echoEvery: number;
  echoDamage: number;
  qiCount: number;
  qiDamage: number;
  qiRange: number;
  qiEffectLevel: number;
  dualAlternateBonus: number;
  dualLengthBonus: number;
  talismanDamage: number;
  talismanInterval: number;
  talismanCount: number;
  talismanSlow: boolean;
  talismanHoming: boolean;
  talismanBlast: boolean;
  talismanDrain: boolean;
  thrustDamage: number;
  thrustThreshold: number;
  thrustChainBonus: number;
  echoStrikeScale: number;
  orbDamage: number;
  orbRadius: number;
  satelliteDamage: number;
  satelliteCount: number;
  satelliteRadius: number;
  satelliteOrbitSpeed: number;
  satelliteSize: number;
  barrageInterval: number;
  heavySpinGain: number;
  heavySpinMax: number;
  heavySpinScale: number;
  parryReach: number;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  weaponName: string;
  weaponKind: WeaponKind;
  tagline: string;
  passive: string;
  skillName: string;
  skillDescription: string;
  skillCooldown: number;
  color: number;
  cssColor: string;
  auraCss: string;
  accentCss: string;
  uniqueUpgradeIds: string[];
  baseStats: CharacterBaseStats;
}

const BASE: CharacterBaseStats = {
  maxHp: 100,
  damage: 14,
  minBlade: 55,
  maxBlade: 400,
  bladeWidth: 12,
  minCutSpeed: 145,
  hitIntervalCap: 0.24,
  turnSpeed: 20,
  speedDamage: 3,
  slashCoefficient: 1,
  thrustCoefficient: 0.3,
  critChance: 0.06,
  critMultiplier: 1.8,
  xpMultiplier: 1,
  lifesteal: 0,
  slowField: 1,
  slowFloor: 0.4,
  echoEvery: 0,
  echoDamage: 0,
  qiCount: 0,
  qiDamage: 0,
  qiRange: 520,
  qiEffectLevel: 0,
  dualAlternateBonus: 0,
  dualLengthBonus: 0,
  talismanDamage: 0,
  talismanInterval: 0,
  talismanCount: 0,
  talismanSlow: false,
  talismanHoming: false,
  talismanBlast: false,
  talismanDrain: false,
  thrustDamage: 0,
  thrustThreshold: 520,
  thrustChainBonus: 0,
  echoStrikeScale: 0.7,
  orbDamage: 0,
  orbRadius: 20,
  satelliteDamage: 0,
  satelliteCount: 0,
  satelliteRadius: 42,
  satelliteOrbitSpeed: 3,
  satelliteSize: 1,
  barrageInterval: 0,
  heavySpinGain: 0,
  heavySpinMax: 0,
  heavySpinScale: 0,
  parryReach: 150,
};

const character = (
  definition: Omit<CharacterDefinition, "baseStats"> & { baseStats: Partial<CharacterBaseStats> },
): CharacterDefinition => ({
  ...definition,
  baseStats: { ...BASE, ...definition.baseStats },
});

export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
  character({
    id: "constella",
    name: "康丝黛拉",
    title: "赛博战斗服娘",
    weaponName: "星轨光剑",
    weaponKind: "lightsaber",
    tagline: "在伺服器的缝隙里，也能听见剑鸣。",
    passive: "高速挥砍会周期性释放穿透剑气。",
    skillName: "剑潮",
    skillDescription: "6 秒内剑气连发，挥砍触发间隔大幅缩短。",
    skillCooldown: 18,
    color: 0x7ef8ff,
    cssColor: "#7ef8ff",
    auraCss: "rgba(126, 248, 255, 0.36)",
    accentCss: "#a4b8ff",
    uniqueUpgradeIds: ["qi-count", "qi-range", "qi-mimic", "qi-power"],
    baseStats: {
      maxHp: 100,
      damage: 16,
      minBlade: 55,
      maxBlade: 420,
      minCutSpeed: 145,
      speedDamage: 3.4,
      slashCoefficient: 0.95,
      thrustCoefficient: 0.35,
      turnSpeed: 22,
      qiCount: 1,
      qiDamage: 8,
      qiRange: 520,
    },
  }),
  character({
    id: "moxibai",
    name: "墨筱白",
    title: "古风侠女",
    weaponName: "均衡双头剑",
    weaponKind: "twinblade",
    tagline: "长刃开路，短刃取命。",
    passive: "双刃长度互补：长刃伤害低，短刃伤害高；交替命中追加伤害。",
    skillName: "定弦",
    skillDescription: "5 秒内锁定双刃当前长度，并移除长刃伤害惩罚。",
    skillCooldown: 20,
    color: 0xffd782,
    cssColor: "#ffd782",
    auraCss: "rgba(255, 215, 130, 0.34)",
    accentCss: "#ff9fbc",
    uniqueUpgradeIds: ["dual-alternate", "dual-balance", "dual-core", "dual-tempo"],
    baseStats: {
      maxHp: 118,
      damage: 12,
      minBlade: 55,
      maxBlade: 390,
      minCutSpeed: 135,
      speedDamage: 2.8,
      slashCoefficient: 0.92,
      thrustCoefficient: 0.68,
      dualAlternateBonus: 8,
      dualLengthBonus: 20,
    },
  }),
  character({
    id: "yeqingyu",
    name: "夜清羽",
    title: "僵尸娘",
    weaponName: "拂袖符",
    weaponKind: "sleeve",
    tagline: "一袖清风，半纸敕令。",
    passive: "袖锋末端伤害更高；定时向剑尖方向投出符咒。",
    skillName: "冰寒",
    skillDescription: "冻结周围涡流，使敌人减速并受到少量寒意伤害。",
    skillCooldown: 18,
    color: 0x8dffd2,
    cssColor: "#8dffd2",
    auraCss: "rgba(141, 255, 210, 0.3)",
    accentCss: "#e6ff9d",
    uniqueUpgradeIds: ["talisman-homing", "talisman-blast", "talisman-drain", "talisman-rate", "sleeve-tip"],
    baseStats: {
      maxHp: 96,
      damage: 14,
      minBlade: 150,
      maxBlade: 410,
      minCutSpeed: 150,
      speedDamage: 3.2,
      slashCoefficient: 1.05,
      thrustCoefficient: 0.2,
      turnSpeed: 18,
      talismanDamage: 4,
      talismanInterval: 2.1,
      talismanCount: 1,
      talismanSlow: true,
    },
  }),
  character({
    id: "lucoco",
    name: "露可可",
    title: "魔女",
    weaponName: "卫星能量球",
    weaponKind: "orb",
    tagline: "星星不是装饰，是会咬人的。",
    passive: "能量球跟随鼠标，卫星环绕切割；移动越快伤害越高。",
    skillName: "引力井",
    skillDescription: "在能量球处制造引力井，拉近并重创周围敌人。",
    skillCooldown: 20,
    color: 0xc7a0ff,
    cssColor: "#c7a0ff",
    auraCss: "rgba(199, 160, 255, 0.34)",
    accentCss: "#7ef8ff",
    uniqueUpgradeIds: ["satellite-count", "satellite-speed", "satellite-size", "barrage"],
    baseStats: {
      maxHp: 92,
      damage: 10,
      minBlade: 90,
      maxBlade: 380,
      minCutSpeed: 120,
      speedDamage: 2.4,
      slashCoefficient: 0.95,
      thrustCoefficient: 0.48,
      turnSpeed: 20,
      orbDamage: 9,
      orbRadius: 20,
      satelliteDamage: 9,
      satelliteCount: 2,
      satelliteRadius: 42,
      satelliteOrbitSpeed: 3,
      satelliteSize: 1,
    },
  }),
  character({
    id: "araman",
    name: "阿罗芒",
    title: "刺剑少女",
    weaponName: "针锋刺剑",
    weaponKind: "rapier",
    tagline: "只差一寸，胜负就已经写完。",
    passive: "斩击伤害较低；快速伸缩刺击伤害高，连续命中叠加层数。",
    skillName: "双刀流",
    skillDescription: "6 秒内刺击命中后，沿同一轨迹召唤残影再刺一次。",
    skillCooldown: 18,
    color: 0xff9b7a,
    cssColor: "#ff9b7a",
    auraCss: "rgba(255, 155, 122, 0.32)",
    accentCss: "#ffd2a1",
    uniqueUpgradeIds: ["thrust-damage", "thrust-chain", "thrust-threshold", "echo-power"],
    baseStats: {
      maxHp: 88,
      damage: 7,
      minBlade: 42,
      maxBlade: 390,
      minCutSpeed: 125,
      speedDamage: 1.4,
      slashCoefficient: 0.38,
      thrustCoefficient: 1.55,
      turnSpeed: 24,
      thrustDamage: 18,
      thrustThreshold: 520,
      thrustChainBonus: 5,
      echoStrikeScale: 0.7,
    },
  }),
  character({
    id: "beitangxue",
    name: "北堂雪",
    title: "重剑少女",
    weaponName: "霜脊重剑",
    weaponKind: "greatsword",
    tagline: "剑不需要更快，涡流会替它加速。",
    passive: "剑长固定；持续同向旋转会积累惯性，提高转速与伤害。",
    skillName: "精准弹反",
    skillDescription: "按下后 0.3 秒内，剑刃撞到敌人时释放冲击并将其弹飞；敌人相撞会传递伤害，但有连锁上限。",
    skillCooldown: 7,
    color: 0xa9d9ff,
    cssColor: "#a9d9ff",
    auraCss: "rgba(169, 217, 255, 0.34)",
    accentCss: "#ffffff",
    uniqueUpgradeIds: ["spin-gain", "spin-max", "heavy-damage", "parry-reach"],
    baseStats: {
      maxHp: 145,
      damage: 24,
      minBlade: 230,
      maxBlade: 230,
      minCutSpeed: 155,
      hitIntervalCap: 0.27,
      turnSpeed: 3.2,
      speedDamage: 4.2,
      slashCoefficient: 1.18,
      thrustCoefficient: 0.12,
      heavySpinGain: 0.8,
      heavySpinMax: 5,
      heavySpinScale: 0.16,
      parryReach: 150,
    },
  }),
];

export const getCharacter = (id: CharacterId): CharacterDefinition =>
  CHARACTER_DEFINITIONS.find((item) => item.id === id) ?? CHARACTER_DEFINITIONS[0];
