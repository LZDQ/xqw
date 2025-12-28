import type * as THREE from "three";
import { Student } from "./Student.ts";
import {
  AC_COMFORT_BONUS_PER_LEVEL,
  BASE_COMFORT_NORTH,
  BASE_COMFORT_SOUTH,
  CANTEEN_PRESSURE_REDUCTION_PER_LEVEL,
  COMPUTER_EFFICIENCY_PER_LEVEL,
  EXTREME_COLD_THRESHOLD,
  EXTREME_HOT_THRESHOLD,
  LIBRARY_EFFICIENCY_PER_LEVEL,
  MAX_COMPUTER_LEVEL,
  MAX_OTHER_FACILITY_LEVEL,
  NORMAL_PROVINCE_MAX_ABILITY,
  NORMAL_PROVINCE_MIN_ABILITY,
  RECOVERY_RATE,
  STRONG_PROVINCE_MAX_ABILITY,
  STRONG_PROVINCE_MIN_ABILITY,
  WEAK_PROVINCE_MAX_ABILITY,
  WEAK_PROVINCE_MIN_ABILITY,
  WEATHER_PENALTY_NO_AC,
  WEATHER_PENALTY_WITH_AC,
  STRONG_PROVINCE_TRAINING_QUALITY,
  NORMAL_PROVINCE_TRAINING_QUALITY,
  WEAK_PROVINCE_TRAINING_QUALITY,
  COST_MULTIPLIER,
  DORM_COMFORT_BONUS_PER_LEVEL,
  ENTERTAINMENT_COST_CS,
  ENTERTAINMENT_COST_MEAL,
  TRAINING_PRESSURE_MULTIPLIER_HEAVY,
  TRAINING_PRESSURE_MULTIPLIER_MEDIUM,
  TRAINING_PRESSURE_MULTIPLIER_LIGHT,
  TRAINING_EFFECT_MULTIPLIER,
  PRESSURE_INCREASE_MULTIPLIER
} from "../lib/constants.ts";
import {
  PROVINCES,
  getDifficultyById,
  getProvinceById,
  type ClimateProfile,
  type DifficultyConfig,
  type ProvinceConfig
} from "../lib/config.ts";
import type { CompetitionName, KnowledgeType, ProvinceStrength } from "../lib/enums.ts";
import type { TrainingTask } from "../data/trainingTasks.ts";
import { selectTrainingTasks } from "../data/trainingTasks.ts";
import {
  COMPETITION_BASE_CUTOFF,
  COMPETITION_ORDER,
  CUTOFF_FLUCTUATION,
  SEASON_WEEKS
} from "../lib/constants.ts";

class Facilities {
  computer = 1;
  ac = 1;
  dorm = 1;
  library = 1;
  canteen = 1;

  getComputerEfficiency(): number {
    return 1.0 + COMPUTER_EFFICIENCY_PER_LEVEL * (this.computer - 1);
  }
  getLibraryEfficiency(): number {
    return 1.0 + LIBRARY_EFFICIENCY_PER_LEVEL * (this.library - 1);
  }
  getCanteenPressureReduction(): number {
    return 1.0 - CANTEEN_PRESSURE_REDUCTION_PER_LEVEL * (this.canteen - 1);
  }
  getDormComfortBonus(): number {
    return DORM_COMFORT_BONUS_PER_LEVEL * (this.dorm - 1);
  }
  // getUpgradeCost(fac: keyof Facilities): number {
  //   const it = FACILITY_UPGRADE_COSTS[fac as keyof typeof FACILITY_UPGRADE_COSTS];
  //   if (!it) return 0;
  //   const level = this[fac];
  //   return Math.floor(it.base * Math.pow(it.grow, level - 1));
  // }
  getMaxLevel(fac: keyof Facilities): number {
    if (fac === "computer" || fac === "library") return MAX_COMPUTER_LEVEL;
    return MAX_OTHER_FACILITY_LEVEL;
  }
  // upgrade(fac: keyof Facilities): void {
  //   if (fac === "computer") this.computer++;
  //   else if (fac === "library") this.library++;
  //   else if (fac === "ac") this.ac++;
  //   else if (fac === "dorm") this.dorm++;
  //   else if (fac === "canteen") this.canteen++;
  // }
  getMaintenanceCost(): number {
    const total = this.computer + this.ac + this.dorm + this.library + this.canteen;
    return Math.floor(100 * Math.pow(total, 1.2));
  }
}

export type QualificationMap = Record<CompetitionName, Set<String>>;
export type RelaxOptionId = 1 | 2 | 3 | 5;

export interface RelaxOption {
  id: RelaxOptionId;
  label: string;
  desc: string;
  cost: number;
}
export interface TrainingResult {
  name: string;
  multiplier: number;
  boosts: Array<{ type: KnowledgeType; baseAmount: number; actualAmount: number }>;
}
export interface PerformTrainingResult {
  success: true;
  task: TrainingTask;
  intensity: number;
  results: TrainingResult[];
}

export class GameState {
  students: Student[] = [];
  facilities: Facilities = new Facilities();
  budget = 100000;
  week = 1;
  reputation = 50;
  temperature = 20;
  weather = "晴";
  provinceId = 1;
  provinceName = "";
  provinceType: ProvinceConfig["type"] | "" = "";
  isNorth = false;
  difficulty = 2;
  difficultyConfig: DifficultyConfig | undefined;
  provinceConfig: ProvinceConfig | undefined;
  baseComfort = 50;
  initialStudents = 0;
  quitStudents = 0;
  hadGoodResultRecently = false;
  weeksSinceEntertainment = 0;
  weeksSinceGoodResult = 0;
  totalExpenses = 0;
  qualification: [QualificationMap, QualificationMap];
  seasonEndTriggered = false;
  gameEnded = false;
  gameEndReason: string | null = null;
  contestCutoffs: Array<Record<CompetitionName, number>>;
  completedCompetitions: Set<string> = new Set();
  careerCompetitions: Array<unknown> = [];
  provinceClimate: ClimateProfile | null = null;
  scene: THREE.Scene | null = null;
  weeklyTrainingTasks: TrainingTask[] = [];

  constructor(difficulty: number, provinceId: number, numStudents: number) {
    this.difficultyConfig = getDifficultyById(difficulty) ?? getDifficultyById(2);
    this.difficulty = this.difficultyConfig?.id ?? 2;

    this.provinceConfig = getProvinceById(provinceId) ?? PROVINCES[0];
    this.provinceId = this.provinceConfig?.id ?? provinceId;
    this.provinceName = this.provinceConfig?.name ?? "";
    this.provinceType = this.provinceConfig?.type ?? "";
    this.isNorth = Boolean(this.provinceConfig?.isNorth);
    this.baseComfort = this.isNorth ? BASE_COMFORT_NORTH : BASE_COMFORT_SOUTH;
    this.provinceClimate = this.provinceConfig?.climate ?? null;

    this.budget = Math.floor(
      (this.provinceConfig?.baseBudget ?? this.budget) *
        (this.difficultyConfig?.budgetMultiplier ?? 1.0)
    );

    const cappedStudents = Math.min(9, Math.max(1, numStudents));
    this.initialStudents = cappedStudents;
    this.students = this.createStudents(cappedStudents);

    this.qualification = [
      this.createEmptyQualificationMap(),
      this.createEmptyQualificationMap()
    ];
    this.contestCutoffs = [this.createEmptyCutoffMap(), this.createEmptyCutoffMap()];

    this.weeklyTrainingTasks = this.getTrainingTasks(6);
    this.updateWeather();
  }

  private createEmptyQualificationMap(): QualificationMap {
    return {
      CSP_S1: new Set(),
      CSP_S2: new Set(),
      NOIP: new Set(),
      PROVINCIAL: new Set(),
      NOI: new Set(),
      CTT_DAY1_2: new Set(),
      CTT_DAY3_4: new Set(),
      CTS: new Set(),
      IOI: new Set()
    };
  }

  private createEmptyCutoffMap(): Record<CompetitionName, number> {
    return {
      CSP_S1: 0,
      CSP_S2: 0,
      NOIP: 0,
      PROVINCIAL: 0,
      NOI: 0,
      CTT_DAY1_2: 0,
      CTT_DAY3_4: 0,
      CTS: 0,
      IOI: 0
    };
  }

  private createStudents(count: number): Student[] {
    const list: Student[] = [];
    const seatIds = this.assignSeats(count);
    const type = this.provinceType;
    let min = NORMAL_PROVINCE_MIN_ABILITY;
    let max = NORMAL_PROVINCE_MAX_ABILITY;
    if (type === "STRONG") {
      min = STRONG_PROVINCE_MIN_ABILITY;
      max = STRONG_PROVINCE_MAX_ABILITY;
    } else if (type === "WEAK") {
      min = WEAK_PROVINCE_MIN_ABILITY;
      max = WEAK_PROVINCE_MAX_ABILITY;
    }
    const abilityOffset = this.difficultyConfig?.abilityOffset ?? 0;
    min += abilityOffset;
    max += abilityOffset;

    for (let i = 0; i < count; i++) {
      const mean = (min + max) / 2;
      const stddev = max - min;
      const thinking = clamp(normal(mean, stddev), 0, 100);
      const coding = clamp(normal(mean, stddev), 0, 100);
      const mental = clamp(normal(mean, stddev), 0, 100);
      const student = new Student(generateName(this.provinceName, i), thinking, coding, mental);
      student.seatId = seatIds[i] ?? null;
      list.push(student);
    }
    return list;
  }

  private assignSeats(count: number): number[] {
    const maxSeats = 9;
    const available = Array.from({ length: maxSeats }, (_, idx) => idx + 1);
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, count);
  }

  getWeatherFactor(): number {
    const extreme = this.temperature < EXTREME_COLD_THRESHOLD || this.temperature > EXTREME_HOT_THRESHOLD;
    if (!extreme) return 1.0;
    if (this.facilities.ac === 1) return 1.5;
    if (this.facilities.ac === 1 && this.facilities.dorm === 1) return 2.0;
    return 1.0;
  }

  getComfort(): number {
    let comfort = this.baseComfort;
    comfort += this.facilities.getDormComfortBonus();
    comfort += AC_COMFORT_BONUS_PER_LEVEL * (this.facilities.ac - 1);
    comfort += 3 * (this.facilities.canteen - 1);
    let weatherPenalty = 0;
    if (this.temperature < EXTREME_COLD_THRESHOLD || this.temperature > EXTREME_HOT_THRESHOLD) {
      weatherPenalty = this.facilities.ac === 1 ? WEATHER_PENALTY_NO_AC : WEATHER_PENALTY_WITH_AC;
    }
    return clamp(comfort - weatherPenalty, 0, 100);
  }

  getWeeklyCost(): number {
    const activeCount = this.students.filter((s) => s && s.active !== false).length;
    return 1000 + 50 * activeCount + this.facilities.getMaintenanceCost();
  }

  getDifficultyModifier(): number {
    if (this.difficulty === 1) return 0.9;
    if (this.difficulty === 3) return 1.1;
    if (this.difficulty === 4) return 1.2;
    return 1.0;
  }

  getTrainingQuality(): number {
    if (this.provinceType === "STRONG") return STRONG_PROVINCE_TRAINING_QUALITY;
    if (this.provinceType === "WEAK") return WEAK_PROVINCE_TRAINING_QUALITY;
    return NORMAL_PROVINCE_TRAINING_QUALITY;
  }

  recordExpense(amount: number, _description = ""): number {
    const expense = Math.max(0, Math.round(amount * COST_MULTIPLIER));
    this.budget = Math.max(0, this.budget - expense);
    this.totalExpenses += expense;
    return expense;
  }

  getExpenseMultiplier(): number {
    const activeCount = this.students.filter((s) => s && s.active !== false).length;
    return Math.max(0, activeCount * 0.3);
  }

  getWeatherDescription(): string {
    let desc = this.weather;
    if (typeof this.temperature === "number") {
      if (this.temperature < 0) desc += " (寒)";
      else if (this.temperature < 10) desc += " (寒冷)";
      else if (this.temperature < 20) desc += " (凉爽)";
      else if (this.temperature < 30) desc += " (温暖)";
      else desc += " (炎热)";
    }
    return desc;
  }

  getTrainingTasks(count = 6): TrainingTask[] {
    const actives = this.students.filter((s) => s && s.active !== false);
    const avgAbility =
      actives.length === 0
        ? 50
        : actives.reduce((sum, s) => sum + (s.thinking + s.coding) / 2, 0) / actives.length;
    const tasks = selectTrainingTasks(count, avgAbility);
    this.weeklyTrainingTasks = tasks;
    return tasks;
  }

  updateWeather(): void {
    try {
      const weekInYear = ((this.week - 1) % 16) + 1;
      const monthOffset = Math.floor((weekInYear - 1) * 10 / 16);
      let month = 9 + monthOffset;
      if (month > 12) month -= 12;
      const season =
        [3, 4, 5].includes(month) ? "spring" : [6, 7, 8].includes(month) ? "summer" : [9, 10, 11].includes(month) ? "autumn" : "winter";

      const fallback: ClimateProfile = this.isNorth
        ? { seasonalTemps: { spring: 12, summer: 26, autumn: 15, winter: -5 }, precipProb: { spring: 0.25, summer: 0.35, autumn: 0.2, winter: 0.1 } }
        : { seasonalTemps: { spring: 18, summer: 30, autumn: 24, winter: 10 }, precipProb: { spring: 0.3, summer: 0.45, autumn: 0.3, winter: 0.1 } };

      const climate = this.provinceClimate ?? fallback;
      const baseSeasonTemp = climate.seasonalTemps[season as keyof typeof climate.seasonalTemps] ?? 15;
      const sd = season === "summer" || season === "spring" ? 3.5 : 5.0;
      this.temperature = Math.round((baseSeasonTemp + normal(0, sd)) * 10) / 10;

      const precipProb = climate.precipProb[season as keyof typeof climate.precipProb] ?? 0.2;
      if (Math.random() < precipProb) {
        this.weather = this.temperature <= 0 ? "雪" : "雨";
      } else {
        this.weather = Math.random() < 0.7 ? "晴" : "阴";
      }
      if (season === "winter" && (this.isNorth || climate?.isPlateau)) {
        if (this.weather === "雨" && this.temperature <= 2 && Math.random() < 0.5) this.weather = "雪";
      }
    } catch {
      const weekInYear = ((this.week - 1) % 16) + 1;
      if (weekInYear >= 1 && weekInYear <= 4) this.temperature = uniform(this.isNorth ? 5 : 15, this.isNorth ? 20 : 28);
      else if (weekInYear >= 5 && weekInYear <= 8) this.temperature = uniform(this.isNorth ? -10 : 5, this.isNorth ? 5 : 15);
      else if (weekInYear >= 9 && weekInYear <= 12) this.temperature = uniform(this.isNorth ? 8 : 18, this.isNorth ? 22 : 28);
      else this.temperature = uniform(this.isNorth ? 20 : 25, this.isNorth ? 32 : 35);

      const roll = Math.random();
      if (roll < 0.65) this.weather = "晴";
      else if (roll < 0.8) this.weather = "阴";
      else if (roll < 0.93) this.weather = "雨";
      else this.weather = "雪";
    }
  }

  recoverWeeklyPressure(): void {
    for (const s of this.students) {
      if (!s || s.active === false) continue;
      s.pressure = Math.max(0, s.pressure - RECOVERY_RATE);
      s.pressure_modifier = Math.max(0, (s.pressure_modifier || 0) - RECOVERY_RATE);
      s.comfort_modifier = Math.max(0, (s.comfort_modifier || 0) - RECOVERY_RATE);
    }
  }

  getSeasonIndexForWeek(week: number = this.week): number {
    return Math.min(1, Math.floor((Math.max(1, week) - 1) / SEASON_WEEKS));
  }

  private getPreviousCompetition(name: CompetitionName): CompetitionName | null {
    const idx = COMPETITION_ORDER.indexOf(name);
    if (idx <= 0) return null;
    return COMPETITION_ORDER[idx - 1] ?? null;
  }

  private getCutoffRatio(name: CompetitionName): number {
    const provinceStrength = (this.provinceType || "NORMAL") as ProvinceStrength;
    const base = COMPETITION_BASE_CUTOFF[name]?.[provinceStrength] ?? 0.5;
    const fluct = uniform(-CUTOFF_FLUCTUATION, CUTOFF_FLUCTUATION);
    return Math.max(0, base + fluct);
  }

  getContestCutoff(name: CompetitionName, totalMaxScore = 0): { ratio: number; score: number } {
    const seasonIdx = this.getSeasonIndexForWeek();
    const existing = this.contestCutoffs[seasonIdx][name];
    const ratio = existing && existing > 0 ? existing : this.getCutoffRatio(name);
    if (!existing || existing <= 0) {
      this.contestCutoffs[seasonIdx][name] = ratio;
    }
    const score = totalMaxScore > 0 ? ratio * totalMaxScore : 0;
    return { ratio, score };
  }

  getEligibleContestants(name: CompetitionName): Student[] {
    const seasonIdx = this.getSeasonIndexForWeek();
    const prev = this.getPreviousCompetition(name);
    if (!prev) {
      return this.students.filter((s) => s && s.active !== false);
    }
    const qualified = this.qualification[seasonIdx][prev] ?? new Set<string>();
    return this.students.filter((s) => s && s.active !== false && qualified.has(s.name));
  }

  updateQualifications(name: CompetitionName, results: Array<{ student: Student; totalScore: number; maxScore: number }>): void {
    const seasonIdx = this.getSeasonIndexForWeek();
    const targetSet = this.qualification[seasonIdx][name] ?? new Set<string>();
    const cutoff = this.getContestCutoff(name, results[0]?.maxScore ?? 0);
    for (const r of results) {
      if (r.totalScore >= cutoff.score) {
        targetSet.add(r.student.name);
      }
    }
    this.qualification[seasonIdx][name] = targetSet;
  }

  advanceWeeks(weeks = 1): void {
    for (let i = 0; i < weeks; i++) {
      this.recoverWeeklyPressure();
      this.week += 1;
      this.updateWeather();
    }
  }

  getRelaxOptions(): RelaxOption[] {
    return [
      { id: 1, label: "放假", desc: "减小少许压力", cost: 0 },
      { id: 2, label: `请学生吃饭 (¥${ENTERTAINMENT_COST_MEAL})`, desc: "补充能量,减小一定压力", cost: ENTERTAINMENT_COST_MEAL },
      { id: 3, label: "体育运动", desc: `减小一定压力,注意天气影响，当前是${this.getWeatherDescription()}天`, cost: 0 },
      { id: 5, label: "邀请学生打CS", desc: "适度减压,有可能提升学生能力", cost: ENTERTAINMENT_COST_CS }
    ];
  }

  performRelax(optionId: RelaxOptionId): { success: true; option: RelaxOption; cost: number; message: string } | { success: false; error: string } {
    const options = this.getRelaxOptions();
    const option = options.find((o) => o.id === optionId) ?? options[0];
    if (!option) return { success: false, error: "没有可用的娱乐选项" };
    if (option.id === 5 && this.facilities.computer < 3) {
      return { success: false, error: "需要计算机等级 ≥ 3" };
    }

    const adjustedCost = Math.round(option.cost * this.getExpenseMultiplier());
    if (this.budget < adjustedCost) {
      return { success: false, error: "经费不足" };
    }
    const charged = this.recordExpense(adjustedCost, `娱乐活动：${option.label}`);

    for (const s of this.students) {
      if (!s || s.active === false) continue;
      if (option.id === 1) {
        s.mental += uniform(3, 7);
        s.pressure = Math.max(0, s.pressure - uniform(30, 45));
      } else if (option.id === 2) {
        s.mental += uniform(8, 20);
        s.pressure = Math.max(0, s.pressure - uniform(40, 55));
      } else if (option.id === 3) {
        let wf = 1.0;
        if (this.weather === "雪") wf = 2.0;
        else if (this.weather === "雨" && this.facilities.dorm < 2) wf = 0.5;
        s.pressure = Math.max(0, s.pressure - uniform(20, 35) * wf);
        s.mental += uniform(3, 8);
      } else if (option.id === 5) {
        s.mental += uniform(1, 5);
        s.coding += uniform(0.5, 1.0);
        s.pressure = Math.max(0, s.pressure - uniform(10, 20));
      }
      s.mental = clamp(s.mental, 0, 100);
      s.pressure = clamp(s.pressure, 0, 100);
    }

    this.weeksSinceEntertainment += 1;
    this.advanceWeeks(1);

    return { success: true, option, cost: charged, message: `娱乐活动完成：${option.label}` };
  }

  performTraining(taskId: string, intensity: number): PerformTrainingResult | { success: false; error: string } {
    const task = this.weeklyTrainingTasks.find((t) => t.id === taskId) ?? this.weeklyTrainingTasks[0];
    if (!task) return { success: false, error: "没有可用的训练题目" };
    const clampedIntensity = clamp(Math.round(intensity), 1, 3);

    const weatherFactor = this.getWeatherFactor();
    const comfort = this.getComfort();
    const comfortFactor = 1.0 + Math.max(0.0, (50 - comfort) / 100.0);

    const results: TrainingResult[] = [];

    for (const s of this.students) {
      if (!s || s.active === false) continue;
      let personalComfort = comfort;
      if (typeof s.comfort_modifier === "number") {
        personalComfort = clamp(personalComfort + s.comfort_modifier, 0, 100);
      }
      s.comfort = personalComfort;

      const sickPenalty = s.sick_weeks > 0 ? 0.7 : 1.0;
      const studentAbility = (s.thinking + s.coding) / 2.0;
      const boostResult = applyTaskBoosts(s, task);

      const libraryLevel = this.facilities.library;
      let libraryBonus = 0;
      if (libraryLevel === 1) libraryBonus = -0.2;
      else if (libraryLevel === 2) libraryBonus = -0.05;
      else if (libraryLevel === 3) libraryBonus = 0.1;
      else if (libraryLevel === 4) libraryBonus = 0.12;
      else if (libraryLevel === 5) libraryBonus = 0.14;
      const libraryMultiplier = 1.0 + libraryBonus;

      const intensityFactor = clampedIntensity === 1 ? 0.7 : clampedIntensity === 3 ? 1.3 : 1.0;

      for (const boost of boostResult.boosts) {
        const totalBoost = Math.floor(boost.actualAmount * libraryMultiplier * intensityFactor * sickPenalty);
        s.addKnowledge(boost.type, totalBoost);
        boost.actualAmount = totalBoost;
      }

      const computerLevel = this.facilities.computer;
      let computerBonus = 0;
      if (computerLevel === 1) computerBonus = -0.2;
      else if (computerLevel === 2) computerBonus = 0;
      else if (computerLevel === 3) computerBonus = 0.1;
      else if (computerLevel === 4) computerBonus = 0.2;
      else if (computerLevel === 5) computerBonus = 0.3;
      const computerMultiplier = 1.0 + computerBonus;

      const abilityGainBase =
        boostResult.multiplier * intensityFactor * (1 - Math.min(0.6, s.pressure / 200.0));
      const thinkingGain =
        uniform(0.6, 1.5) * abilityGainBase * computerMultiplier * TRAINING_EFFECT_MULTIPLIER;
      const codingGain =
        uniform(1, 2.5) * abilityGainBase * computerMultiplier * TRAINING_EFFECT_MULTIPLIER;

      s.thinking += thinkingGain;
      s.coding += codingGain;

      let basePressure = clampedIntensity === 1 ? 15 : clampedIntensity === 2 ? 25 : 40;
      const difficultyPressure = Math.max(0, (task.difficulty - studentAbility) * 0.2);
      basePressure += difficultyPressure;

      if (clampedIntensity === 3) basePressure *= TRAINING_PRESSURE_MULTIPLIER_HEAVY;
      else if (clampedIntensity === 2) basePressure *= TRAINING_PRESSURE_MULTIPLIER_MEDIUM;
      else basePressure *= TRAINING_PRESSURE_MULTIPLIER_LIGHT;

      const canteenReduction = this.facilities.getCanteenPressureReduction();
      let pressureIncrease = basePressure * weatherFactor * canteenReduction * comfortFactor;
      if (s.sick_weeks > 0) pressureIncrease += 10;
      pressureIncrease *= PRESSURE_INCREASE_MULTIPLIER;

      let totalPressureChange = pressureIncrease;
      if (typeof s.pressure_modifier === "number") {
        totalPressureChange += s.pressure_modifier;
        s.pressure_modifier = 0;
      }

      s.pressure = clamp(s.pressure + totalPressureChange, 0, 100);

      results.push({
        name: s.name,
        multiplier: boostResult.multiplier,
        boosts: boostResult.boosts
      });
    }

    this.weeksSinceEntertainment += 1;
    this.advanceWeeks(1);
    this.weeklyTrainingTasks = this.getTrainingTasks(6);

    return { success: true, task, intensity: clampedIntensity, results };
  }
}

function uniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function normal(mean = 0, stddev = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * stddev + mean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function calculateBoostMultiplier(studentAbility: number, taskDifficulty: number): number {
  const diff = studentAbility - taskDifficulty;
  let multiplier: number;

  if (diff >= -10) {
    multiplier = 1.0;
  } else if (diff < -10 && diff >= -50) {
    multiplier = 1.0 + (diff + 10) * (0.4 / 40);
  } else if (diff < -50 && diff >= -100) {
    multiplier = 0.6 + (diff + 50) * (0.3 / 50);
  } else {
    const excess = Math.abs(diff + 100);
    multiplier = 0.3 - 0.2 * Math.min(1.0, excess / 100);
  }
  return clamp(multiplier, 0.1, 1.0);
}

function applyTaskBoosts(student: Student, task: TrainingTask): { multiplier: number; boosts: Array<{ type: KnowledgeType; baseAmount: number; actualAmount: number }> } {
  const studentAbility = (student.thinking + student.coding) / 2.0;
  const multiplier = calculateBoostMultiplier(studentAbility, task.difficulty);
  const boosts = task.boosts.map((boost) => ({
    type: boost.type,
    baseAmount: boost.amount,
    actualAmount: Math.floor(boost.amount * multiplier)
  }));
  return { multiplier, boosts };
}

function generateName(region: string, idx: number): string {
  return `${region || "学生"}-${idx + 1}`;
}
