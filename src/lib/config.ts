import { type ProvinceStrength } from "./enums.ts";

export interface ClimateProfile {
  seasonalTemps: { spring: number; summer: number; autumn: number; winter: number };
  precipProb: { spring: number; summer: number; autumn: number; winter: number };
  isPlateau?: boolean;
}

export interface ProvinceConfig {
  id: number;
  name: string;
  type: ProvinceStrength;
  isNorth: boolean;
  baseBudget: number;
  trainingQuality: number;
  climate?: ClimateProfile | null;
}

export interface DifficultyConfig {
  id: number;
  name: string;
  description: string;
  budgetMultiplier: number;
  abilityOffset: number;
}

export const DIFFICULTIES: readonly DifficultyConfig[] = [
  { id: 1, name: "简单", description: "更宽松的预算与能力基础", budgetMultiplier: 1.5, abilityOffset: 20 },
  { id: 2, name: "普通", description: "标准规则", budgetMultiplier: 1.0, abilityOffset: 0 },
  { id: 3, name: "专家", description: "预算紧缩且能力基础降低", budgetMultiplier: 0.5, abilityOffset: -20 },
  { id: 4, name: "挑战", description: "极限资金与能力压缩模式", budgetMultiplier: 0.35, abilityOffset: -35 }
] as const;

const southNames = [
  "海南",
  "广东",
  "广西",
  "云南",
  "福建",
  "台湾",
  "湖南",
  "湖北",
  "江西",
  "贵州",
  "四川",
  "重庆",
  "浙江",
  "香港",
  "澳门"
];

function createDefaultClimate(isNorth: boolean, name: string): ClimateProfile {
  const north: ClimateProfile = {
    seasonalTemps: { spring: 12, summer: 26, autumn: 15, winter: -5 },
    precipProb: { spring: 0.25, summer: 0.35, autumn: 0.2, winter: 0.1 }
  };
  const south: ClimateProfile = {
    seasonalTemps: { spring: 18, summer: 30, autumn: 24, winter: 10 },
    precipProb: { spring: 0.3, summer: 0.45, autumn: 0.3, winter: 0.1 }
  };
  const plateau: ClimateProfile = {
    seasonalTemps: { spring: 5, summer: 15, autumn: 8, winter: -8 },
    precipProb: { spring: 0.15, summer: 0.2, autumn: 0.1, winter: 0.05 },
    isPlateau: true
  };

  const nameLower = name.toLowerCase();
  if (nameLower.includes("西藏") || nameLower.includes("青海")) return plateau;
  if (southNames.some((s) => nameLower.includes(s))) return south;
  return isNorth ? north : north;
}

const RAW_PROVINCES: ProvinceConfig[] = [
  // 强省
  { id: 1, name: "北京", type: "STRONG", isNorth: true, baseBudget: 200000, trainingQuality: 1.3, climate: null },
  { id: 2, name: "重庆", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 3, name: "湖南", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 4, name: "广东", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 5, name: "四川", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 6, name: "浙江", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 7, name: "上海", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 8, name: "福建", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 9, name: "江苏", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  { id: 10, name: "山东", type: "STRONG", isNorth: false, baseBudget: 200000, trainingQuality: 1.3 },
  // 普通省
  { id: 11, name: "湖北", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 12, name: "江西", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 13, name: "河北", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 14, name: "香港", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 15, name: "陕西", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 16, name: "河南", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 17, name: "安徽", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 18, name: "黑龙江", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 19, name: "广西", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 20, name: "辽宁", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 21, name: "吉林", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 22, name: "天津", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 23, name: "山西", type: "NORMAL", isNorth: true, baseBudget: 100000, trainingQuality: 0.8 },
  { id: 24, name: "贵州", type: "NORMAL", isNorth: false, baseBudget: 100000, trainingQuality: 0.8 },
  // 弱省
  { id: 25, name: "澳门", type: "WEAK", isNorth: false, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 26, name: "新疆", type: "WEAK", isNorth: true, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 27, name: "海南", type: "WEAK", isNorth: false, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 28, name: "内蒙古", type: "WEAK", isNorth: true, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 29, name: "云南", type: "WEAK", isNorth: false, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 30, name: "宁夏", type: "WEAK", isNorth: true, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 31, name: "甘肃", type: "WEAK", isNorth: true, baseBudget: 40000, trainingQuality: 0.3 },
  { id: 32, name: "青海", type: "WEAK", isNorth: true, baseBudget: 40000, trainingQuality: 0.3 },
  // 兼容性保留：西藏
  { id: 33, name: "西藏", type: "WEAK", isNorth: true, baseBudget: 40000, trainingQuality: 0.3 }
];

export const PROVINCES: readonly ProvinceConfig[] = RAW_PROVINCES.map((p) => ({
  ...p,
  climate: p.climate ?? createDefaultClimate(p.isNorth, p.name)
}));

export function getProvinceById(id: number): ProvinceConfig | undefined {
  return PROVINCES.find((p) => p.id === id);
}

export function getDifficultyById(id: number): DifficultyConfig | undefined {
  return DIFFICULTIES.find((d) => d.id === id);
}
