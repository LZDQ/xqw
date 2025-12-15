/* constants.js - 拆分自原始主脚本的常量与省份数据 */
/* =================== 常量（与 C++ 保持一致） =================== */
import { COMPETITION_NAME, PROVINCE_STRENGTH, type CompetitionName, type ProvinceStrength } from "./enums.ts";

// 比赛定义
export interface Competition {
  week: number;
  name: CompetitionName;
  difficulty: number;
  maxScore: number;
  numProblems: number;
  nationalTeam?: boolean;
  subtasksPerProblem?: number;
}

/* 时间与赛季 */
export const ORIGINAL_SEASON_WEEKS = 52;
export const SEASON_WEEKS = 32;

/* 能力与知识权重 */
export const KNOWLEDGE_WEIGHT = 0.6;
export const ABILITY_WEIGHT = 0.4;
// 当思维/代码超过该阈值时，对后续的增幅进行衰减
export const ABILITY_DECAY_THRESHOLD = 400;

/* 压力/恢复 */
export const RECOVERY_RATE = 7.0;
export const FATIGUE_FROM_PRESSURE = 180.0;
export const ALPHA1 = 28.0;

/* 省份基础 */
export const STRONG_PROVINCE_BUDGET = 200000;
export const NORMAL_PROVINCE_BUDGET = 100000;
export const WEAK_PROVINCE_BUDGET = 40000;
export const STRONG_PROVINCE_TRAINING_QUALITY = 1.3;
export const NORMAL_PROVINCE_TRAINING_QUALITY = 0.8;
export const WEAK_PROVINCE_TRAINING_QUALITY = 0.3;

/* 比赛日程 */
export const COMPETITION_SCHEDULE: readonly Competition[] = [
  { week: 9, name: COMPETITION_NAME.CSP_S1, difficulty: 65, maxScore: 100, numProblems: 1 },
  { week: 17, name: COMPETITION_NAME.CSP_S2, difficulty: 145, maxScore: 400, numProblems: 4 },
  { week: 25, name: COMPETITION_NAME.NOIP, difficulty: 205, maxScore: 400, numProblems: 4 },
  { week: 40, name: COMPETITION_NAME.PROVINCIAL, difficulty: 340, maxScore: 600, numProblems: 6 },
  { week: 52, name: COMPETITION_NAME.NOI, difficulty: 460, maxScore: 700, numProblems: 7 },
  // 国家集训队比赛（仅在第二年NOI金牌且接受后才会生效）
  { week: 54, name: COMPETITION_NAME.CTT_DAY1_2, difficulty: 520, maxScore: 600, numProblems: 6, nationalTeam: true },
  { week: 55, name: COMPETITION_NAME.CTT_DAY3_4, difficulty: 520, maxScore: 600, numProblems: 6, nationalTeam: true },
  { week: 56, name: COMPETITION_NAME.CTS, difficulty: 590, maxScore: 800, numProblems: 8, nationalTeam: true },
  { week: 57, name: COMPETITION_NAME.IOI, difficulty: 650, maxScore: 600, numProblems: 6, nationalTeam: true, subtasksPerProblem: 15 }
];

// 正式比赛题目难度系数配置
export type CompetitionDifficultyFactors = Record<CompetitionName, number[]>;

export const COMPETITION_DIFFICULTY_FACTORS: CompetitionDifficultyFactors = {
  [COMPETITION_NAME.CSP_S1]: [1.0],
  [COMPETITION_NAME.CSP_S2]: [0.5, 1.0, 1.5, 2.0],
  [COMPETITION_NAME.NOIP]: [0.5, 0.8, 1.5, 2.5],
  [COMPETITION_NAME.PROVINCIAL]: [0.7, 0.7, 1.2, 1.5, 1.8, 1.8],
  [COMPETITION_NAME.NOI]: [0.5, 0.8, 1.0, 1.2, 1.3, 1.3, 1.5],
  [COMPETITION_NAME.CTT_DAY1_2]: [1.2, 1.2, 1.2, 1.5, 1.5, 1.5],
  [COMPETITION_NAME.CTT_DAY3_4]: [1.2, 1.2, 1.2, 1.5, 1.5, 1.5],
  [COMPETITION_NAME.CTS]: [1.0, 1.2, 1.2, 1.5, 1.5, 1.7, 1.7, 1.7],
  [COMPETITION_NAME.IOI]: [0.8, 0.8, 1.2, 1.5, 1.8, 2.2]
};

// 明确的比赛链顺序（用于链式晋级判断）
export const COMPETITION_ORDER: readonly CompetitionName[] = [
  COMPETITION_NAME.CSP_S1,
  COMPETITION_NAME.CSP_S2,
  COMPETITION_NAME.NOIP,
  COMPETITION_NAME.PROVINCIAL,
  COMPETITION_NAME.NOI
];

export const OTHER_COUNTRY_MIN_ABILITY = 130;
// IOI奖牌线（相对总分的百分比）
export const IOI_GOLD_THRESHOLD = 0.8;
export const IOI_SILVER_THRESHOLD = 0.65;
export const IOI_BRONZE_THRESHOLD = 0.2;

/* 晋级线基准 - 基于省份强弱的固定分数线（占总分百分比） */
export interface CompetitionCutoff {
  "强省": number;
  "普通省": number;
  "弱省": number;
}

export type CompetitionCutoffMap = Record<CompetitionName, CompetitionCutoff>;

export const COMPETITION_BASE_CUTOFF: CompetitionCutoffMap = {
  [COMPETITION_NAME.CSP_S1]: {
    [PROVINCE_STRENGTH.STRONG]: 0.70,
    [PROVINCE_STRENGTH.NORMAL]: 0.60,
    [PROVINCE_STRENGTH.WEAK]: 0.50
  },
  [COMPETITION_NAME.CSP_S2]: {
    [PROVINCE_STRENGTH.STRONG]: 0.65,
    [PROVINCE_STRENGTH.NORMAL]: 0.55,
    [PROVINCE_STRENGTH.WEAK]: 0.45
  },
  [COMPETITION_NAME.NOIP]: {
    [PROVINCE_STRENGTH.STRONG]: 0.60,
    [PROVINCE_STRENGTH.NORMAL]: 0.50,
    [PROVINCE_STRENGTH.WEAK]: 0.40
  },
  [COMPETITION_NAME.PROVINCIAL]: {
    [PROVINCE_STRENGTH.STRONG]: 0.70,
    [PROVINCE_STRENGTH.NORMAL]: 0.60,
    [PROVINCE_STRENGTH.WEAK]: 0.50
  },
  [COMPETITION_NAME.NOI]: {
    [PROVINCE_STRENGTH.STRONG]: 0.80,
    [PROVINCE_STRENGTH.NORMAL]: 0.80,
    [PROVINCE_STRENGTH.WEAK]: 0.80
  },
  [COMPETITION_NAME.CTT_DAY1_2]: {
    [PROVINCE_STRENGTH.STRONG]: 0.0,
    [PROVINCE_STRENGTH.NORMAL]: 0.0,
    [PROVINCE_STRENGTH.WEAK]: 0.0
  },
  [COMPETITION_NAME.CTT_DAY3_4]: {
    [PROVINCE_STRENGTH.STRONG]: 0.0,
    [PROVINCE_STRENGTH.NORMAL]: 0.0,
    [PROVINCE_STRENGTH.WEAK]: 0.0
  },
  [COMPETITION_NAME.CTS]: {
    [PROVINCE_STRENGTH.STRONG]: 0.0,
    [PROVINCE_STRENGTH.NORMAL]: 0.0,
    [PROVINCE_STRENGTH.WEAK]: 0.0
  },
  [COMPETITION_NAME.IOI]: {
    [PROVINCE_STRENGTH.STRONG]: IOI_GOLD_THRESHOLD,
    [PROVINCE_STRENGTH.NORMAL]: IOI_GOLD_THRESHOLD,
    [PROVINCE_STRENGTH.WEAK]: IOI_GOLD_THRESHOLD
  }
};

// 晋级线浮动范围（上下浮动的百分比）
export const CUTOFF_FLUCTUATION = 0.05;

/* 学生能力范围 */
export const STRONG_PROVINCE_MIN_ABILITY = 50.0;
export const STRONG_PROVINCE_MAX_ABILITY = 70.0;
export const NORMAL_PROVINCE_MIN_ABILITY = 30.0;
export const NORMAL_PROVINCE_MAX_ABILITY = 55.0;
export const WEAK_PROVINCE_MIN_ABILITY = 20.0;
export const WEAK_PROVINCE_MAX_ABILITY = 45.0;

// 初始能力
export const KNOWLEDGE_ABILITY_START = 15;

/* 难度修正 */
export const EASY_MODE_BUDGET_MULTIPLIER = 1.5;
export const HARD_MODE_BUDGET_MULTIPLIER = 0.5;
export const EASY_MODE_ABILITY_BONUS = 20.0;
export const HARD_MODE_ABILITY_PENALTY = 20.0;

/* 设施 */
export interface FacilityUpgradeCost {
  base: number;
  grow: number;
}

export interface FacilityUpgradeCosts {
  computer: FacilityUpgradeCost;
  library: FacilityUpgradeCost;
  ac: FacilityUpgradeCost;
  dorm: FacilityUpgradeCost;
  canteen: FacilityUpgradeCost;
}

export const FACILITY_UPGRADE_COSTS: FacilityUpgradeCosts = {
  computer: { base: 20000, grow: 1.6 },
  library: { base: 15000, grow: 1.5 },
  ac: { base: 8000, grow: 1.4 },
  dorm: { base: 8000, grow: 1.4 },
  canteen: { base: 8000, grow: 1.4 }
};
export const MAX_COMPUTER_LEVEL = 5;
export const MAX_LIBRARY_LEVEL = 5;
export const MAX_OTHER_FACILITY_LEVEL = 3;
export const COMPUTER_EFFICIENCY_PER_LEVEL = 0.07;
export const LIBRARY_EFFICIENCY_PER_LEVEL = 0.06;
export const CANTEEN_PRESSURE_REDUCTION_PER_LEVEL = 0.06;
export const DORM_COMFORT_BONUS_PER_LEVEL = 5.5;
export const AC_COMFORT_BONUS_PER_LEVEL = 9.0;

/* 天气/舒适 */
export const BASE_COMFORT_NORTH = 45.0;
export const BASE_COMFORT_SOUTH = 55.0;
export const EXTREME_COLD_THRESHOLD = 5;
export const EXTREME_HOT_THRESHOLD = 35;
export const WEATHER_PENALTY_NO_AC = 20.0;
export const WEATHER_PENALTY_WITH_AC = 10.0;

/* 训练 */
export const TRAINING_BASE_KNOWLEDGE_GAIN_PER_INTENSITY = 15;
// 最小训练增益：略微提高默认增益以匹配题目难度
export const TRAINING_THINKING_GAIN_MIN = 0.55;
export const TRAINING_CODING_GAIN_MIN = 0.55;

// 题目难度归一化与斜率
export const DIFFICULTY_NORMALIZE_DIVISOR = 3.8;
export const DIFFICULTY_TO_SKILL_SLOPE = 1.6;
export const THINKING_DIFFICULTY_BONUS = 0.45;
export const CODING_DIFFICULTY_BONUS = 0.0;
export const TRAINING_PRESSURE_MULTIPLIER_LIGHT = 1.0;
export const TRAINING_PRESSURE_MULTIPLIER_MEDIUM = 1.5;
export const TRAINING_PRESSURE_MULTIPLIER_HEAVY = 2.5;
export const COMPOSITE_TRAINING_PRESSURE_BONUS = 1.2;
// 每次训练/外出集训后获得天赋的概率门槛
export const GET_TALENT_PROBABILITY = 0.15;

/* 比赛/模拟赛增幅上限配置 */
export const CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN = 12;
export const CONTEST_MAX_TOTAL_THINKING_GAIN = 6.0;
export const CONTEST_MAX_TOTAL_CODING_GAIN = 6.0;

// 不同难度比赛的增幅系数（相对于上限的比例，0.0-1.0）
export interface ContestGainRatio {
  knowledge: number;
  thinking: number;
  coding: number;
}

export type ContestGainRatios = Record<string, ContestGainRatio>;

export const CONTEST_GAIN_RATIOS: ContestGainRatios = {
  [COMPETITION_NAME.CSP_S1]: { knowledge: 0.3, thinking: 0.3, coding: 0.3 },
  [COMPETITION_NAME.CSP_S2]: { knowledge: 0.5, thinking: 0.5, coding: 0.5 },
  [COMPETITION_NAME.NOIP]: { knowledge: 0.7, thinking: 0.7, coding: 0.7 },
  [COMPETITION_NAME.PROVINCIAL]: { knowledge: 0.9, thinking: 0.9, coding: 0.9 },
  [COMPETITION_NAME.NOI]: { knowledge: 1.0, thinking: 1.0, coding: 1.0 },
  online_low: { knowledge: 0.4, thinking: 0.4, coding: 0.4 },
  online_medium: { knowledge: 0.6, thinking: 0.6, coding: 0.6 },
  online_high: { knowledge: 0.85, thinking: 0.85, coding: 0.85 }
};

/* 外出集训 */
export const OUTFIT_BASE_COST_BASIC = 17000;
export const OUTFIT_BASE_COST_INTERMEDIATE = 25000;
export const OUTFIT_BASE_COST_ADVANCED = 70000;
export const STRONG_PROVINCE_COST_MULTIPLIER = 1.5;
export const WEAK_PROVINCE_COST_MULTIPLIER = 0.7;
export const OUTFIT_KNOWLEDGE_BASE_BASIC = 8;
export const OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE = 15;
export const OUTFIT_KNOWLEDGE_BASE_ADVANCED = 25;
export const OUTFIT_ABILITY_BASE_BASIC = 12.0;
export const OUTFIT_ABILITY_BASE_INTERMEDIATE = 20.0;
export const OUTFIT_ABILITY_BASE_ADVANCED = 35.0;
export const OUTFIT_PRESSURE_BASIC = 30;
export const OUTFIT_PRESSURE_INTERMEDIATE = 50;
export const OUTFIT_PRESSURE_ADVANCED = 75;
// 声誉影响
export const OUTFIT_REPUTATION_DISCOUNT = 0.60;
export const OUTFIT_REPUTATION_DISCOUNT_MULTIPLIER = 2.0;
export const COMMERCIAL_REP_BONUS = 0.50;
export const MEDIA_REP_BONUS = 0.40;

/* 模拟赛 */
export const MOCK_CONTEST_PURCHASE_MIN_COST = 3000;
export const MOCK_CONTEST_PURCHASE_MAX_COST = 8000;
export const MOCK_CONTEST_GAIN_MULTIPLIER_PURCHASED = 1.8;

// 网赛类型配置
export interface OnlineContestType {
  name: string;
  numProblems: number;
  difficulty: number;
  displayName: string;
}

export const ONLINE_CONTEST_TYPES: readonly OnlineContestType[] = [
  { name: "Atcoder-ABC", numProblems: 7, difficulty: 120, displayName: "Atcoder ABC" },
  { name: "Atcoder-ARC", numProblems: 4, difficulty: 230, displayName: "Atcoder ARC" },
  { name: "Codeforces-Div3", numProblems: 5, difficulty: 120, displayName: "Codeforces Div.3" },
  { name: "Codeforces-Div2", numProblems: 5, difficulty: 230, displayName: "Codeforces Div.2" },
  { name: "Codeforces-Div1", numProblems: 5, difficulty: 370, displayName: "Codeforces Div.1" },
  { name: "洛谷月赛", numProblems: 4, difficulty: 240, displayName: "洛谷月赛" },
  { name: "Ucup", numProblems: 4, difficulty: 370, displayName: "Ucup" }
];

/* 娱乐 */
export const ENTERTAINMENT_COST_MEAL = 3000;
export const ENTERTAINMENT_COST_CS = 1000;

/* 放假 */
export const VACATION_MAX_DAYS = 7;

/* 比赛奖励 */
export const NOI_GOLD_THRESHOLD = 0.8;
export const NOI_SILVER_THRESHOLD = 0.56;
export const NOI_BRONZE_THRESHOLD = 0.4;

// NOI分级奖励（按奖牌等级）
export const NOI_GOLD_REWARD_MIN = 20000;
export const NOI_GOLD_REWARD_MAX = 40000;
export const NOI_SILVER_REWARD_MIN = 10000;
export const NOI_SILVER_REWARD_MAX = 20000;
export const NOI_BRONZE_REWARD_MIN = 5000;
export const NOI_BRONZE_REWARD_MAX = 10000;

// 其他比赛奖励（保持原有逻辑）
export const NOIP_REWARD_MIN = 10000;
export const NOIP_REWARD_MAX = 20000;
export const CSP_S2_REWARD_MIN = 4000;
export const CSP_S2_REWARD_MAX = 8000;
export const CSP_S1_REWARD_MIN = 2000;
export const CSP_S1_REWARD_MAX = 5000;

/* 随机事件 */
export const BASE_SICK_PROB = 0.025;
export const SICK_PROB_FROM_COLD_HOT = 0.03;
export const QUIT_PROB_BASE = 0.22;
export const QUIT_PROB_PER_EXTRA_PRESSURE = 0.02;
export const TALENT_LOST_VALUE = 75; // 触发丧失天赋的压力阈值

/* 劝退消耗声誉 */
export const EVICT_REPUTATION_COST = 10;

/* =========== 失误系统 =========== */
// 失误概率基础参数
export const MISTAKE_BASE_PROBABILITY = 0.15;  // 代码能力为0时的基础失误概率
export const MISTAKE_MIN_PROBABILITY = 0.02;   // 最低失误概率（代码能力>=100时）
export const MISTAKE_CODING_FACTOR = 0.0013;   // 代码能力对失误概率的影响系数

// 失误扣分参数
export const MISTAKE_MIN_PENALTY = 0.10;       // 最小扣分比例（10%）
export const MISTAKE_MAX_PENALTY = 1.00;       // 最大扣分比例（100%）

// 失误理由列表
export const MISTAKE_REASONS: readonly string[] = [
  "边界条件处理不当",
  "数组越界",
  "忘记特判T1!=T2",
  "循环变量写错",
  "递归边界错误",
  "忘记初始化",
  "取模写漏了",
  "N和M写反了",
  "忘记开longlong",
  "没看到多组数据",
  "忘记清空数组",
  "忘记关闭调试输出",
  "cerr调试忘删TLE了"
];

/* =========== 全局增幅变量 =========== */
// 这些增幅在最终应用影响时作为乘数，默认为1.000
export let TRAINING_EFFECT_MULTIPLIER = 1.0;
export let OUTFIT_EFFECT_MULTIPLIER = 1.0;
export let PRESSURE_INCREASE_MULTIPLIER = 1.0;
export let PASS_LINE_MULTIPLIER = 1.0;
export let DIFFICULTY_MULTIPLIER = 1.0;
export let COST_MULTIPLIER = 1.0;

const SOUTH_PROVINCES = [
  "海南", "广东", "广西", "云南", "福建", "台湾",
  "湖南", "湖北", "江西", "贵州", "四川", "重庆",
  "浙江", "香港", "澳门"
];

// 结构：{ seasonalTemps: { spring, summer, autumn, winter }, precipProb: { spring, summer, autumn, winter } }
export interface ProvinceClimateSeasonal {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
}

export interface ProvinceClimate {
  seasonalTemps: ProvinceClimateSeasonal;
  precipProb: ProvinceClimateSeasonal;
}

export interface Province {
  name: string;
  type: ProvinceStrength;
  isNorth: boolean;
  baseBudget: number;
  trainingQuality: number;
  climate: ProvinceClimate;
}

export type ProvinceMap = Record<number, Province>;

export function createDefaultClimate(isNorth: boolean, name: string): ProvinceClimate {
  const north: ProvinceClimate = {
    seasonalTemps: { spring: 12, summer: 26, autumn: 15, winter: -5 },
    precipProb: { spring: 0.25, summer: 0.35, autumn: 0.20, winter: 0.10 }
  };
  const south: ProvinceClimate = {
    seasonalTemps: { spring: 18, summer: 30, autumn: 24, winter: 10 },
    precipProb: { spring: 0.30, summer: 0.45, autumn: 0.30, winter: 0.10 }
  };
  const plateau: ProvinceClimate = {
    seasonalTemps: { spring: 5, summer: 15, autumn: 8, winter: -8 },
    precipProb: { spring: 0.15, summer: 0.20, autumn: 0.10, winter: 0.05 }
  };

  const nameLower = (name || "").toLowerCase();
  // 高原地区优先判断
  if(nameLower.includes("西藏") || nameLower.includes("青海")) return plateau;
  if(SOUTH_PROVINCES.some(p => nameLower.includes(p.toLowerCase()))) return south;
  // 默认为北方（若传入了 isNorth 参数也保持兼容）
  return isNorth ? north : north;
}

/* =========== 省份数据 =========== */
export const PROVINCES: ProvinceMap = {
  1: { name: "北京", type: PROVINCE_STRENGTH.STRONG, isNorth: true, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  2: { name: "重庆", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  3: { name: "湖南", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  4: { name: "广东", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  5: { name: "四川", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  6: { name: "浙江", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  7: { name: "上海", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  8: { name: "福建", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  9: { name: "江苏", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  10: { name: "山东", type: PROVINCE_STRENGTH.STRONG, isNorth: false, baseBudget: STRONG_PROVINCE_BUDGET, trainingQuality: STRONG_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  11: { name: "湖北", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  12: { name: "江西", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  13: { name: "河北", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  14: { name: "香港", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  15: { name: "陕西", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  16: { name: "河南", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  17: { name: "安徽", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  18: { name: "黑龙江", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  19: { name: "广西", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  20: { name: "辽宁", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  21: { name: "吉林", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  22: { name: "天津", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  23: { name: "山西", type: PROVINCE_STRENGTH.NORMAL, isNorth: true, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  24: { name: "贵州", type: PROVINCE_STRENGTH.NORMAL, isNorth: false, baseBudget: NORMAL_PROVINCE_BUDGET, trainingQuality: NORMAL_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  25: { name: "澳门", type: PROVINCE_STRENGTH.WEAK, isNorth: false, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  26: { name: "新疆", type: PROVINCE_STRENGTH.WEAK, isNorth: true, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  27: { name: "海南", type: PROVINCE_STRENGTH.WEAK, isNorth: false, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  28: { name: "内蒙古", type: PROVINCE_STRENGTH.WEAK, isNorth: true, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  29: { name: "云南", type: PROVINCE_STRENGTH.WEAK, isNorth: false, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  30: { name: "宁夏", type: PROVINCE_STRENGTH.WEAK, isNorth: true, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  31: { name: "甘肃", type: PROVINCE_STRENGTH.WEAK, isNorth: true, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  32: { name: "青海", type: PROVINCE_STRENGTH.WEAK, isNorth: true, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate },
  33: { name: "西藏", type: PROVINCE_STRENGTH.WEAK, isNorth: true, baseBudget: WEAK_PROVINCE_BUDGET, trainingQuality: WEAK_PROVINCE_TRAINING_QUALITY, climate: null as unknown as ProvinceClimate }
};

for(const key in PROVINCES){
  const idx = Number(key);
  const province = PROVINCES[idx];
  if(!province.climate){
    province.climate = createDefaultClimate(province.isNorth, province.name);
  }
}
