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
  FACILITY_UPGRADE_COSTS,
  LIBRARY_EFFICIENCY_PER_LEVEL,
  MAX_COMPUTER_LEVEL,
  MAX_LIBRARY_LEVEL,
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
  COMPETITION_ORDER,
  COST_MULTIPLIER,
  DORM_COMFORT_BONUS_PER_LEVEL
} from "../lib/constants.ts";
import {
  PROVINCES,
  getDifficultyById,
  getProvinceById,
  type ClimateProfile,
  type DifficultyConfig,
  type ProvinceConfig
} from "../lib/config.ts";
import { COMPETITION_NAME, type CompetitionName } from "../lib/enums.ts";

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
  upgrade(fac: keyof Facilities): void {
    if (fac === "computer") this.computer++;
    else if (fac === "library") this.library++;
    else if (fac === "ac") this.ac++;
    else if (fac === "dorm") this.dorm++;
    else if (fac === "canteen") this.canteen++;
  }
  getMaintenanceCost(): number {
    const total = this.computer + this.ac + this.dorm + this.library + this.canteen;
    return Math.floor(100 * Math.pow(total, 1.2));
  }
}

export type QualificationMap = Record<CompetitionName, Set<String>>;

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
  completedCompetitions: Set<string> = new Set();
  careerCompetitions: Array<unknown> = [];
  provinceClimate: ClimateProfile | null = null;
  scene: THREE.Scene | null = null;

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

function generateName(region: string, idx: number): string {
  return `${region || "学生"}-${idx + 1}`;
}
