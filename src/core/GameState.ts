import type * as THREE from "three";
import { Student } from "./Student.ts";
import { TALENTS, type TalentName } from "./Talents.ts";
import { applyTalentPassives } from "./talentEffects.ts";
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
  OUTFIT_BASE_COST_BASIC,
  OUTFIT_BASE_COST_ADVANCED,
  OUTFIT_BASE_COST_INTERMEDIATE,
  OUTFIT_KNOWLEDGE_BASE_BASIC,
  OUTFIT_KNOWLEDGE_BASE_ADVANCED,
  OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE,
  OUTFIT_ABILITY_BASE_BASIC,
  OUTFIT_ABILITY_BASE_ADVANCED,
  OUTFIT_ABILITY_BASE_INTERMEDIATE,
  OUTFIT_PRESSURE_BASIC,
  OUTFIT_PRESSURE_ADVANCED,
  OUTFIT_PRESSURE_INTERMEDIATE,
  OUTFIT_REPUTATION_DISCOUNT,
  OUTFIT_REPUTATION_DISCOUNT_MULTIPLIER,
  STRONG_PROVINCE_COST_MULTIPLIER,
  WEAK_PROVINCE_COST_MULTIPLIER,
  OUTFIT_EFFECT_MULTIPLIER,
  COST_MULTIPLIER,
  DORM_COMFORT_BONUS_PER_LEVEL,
  ENTERTAINMENT_COST_CS,
  ENTERTAINMENT_COST_MEAL,
  TRAINING_PRESSURE_MULTIPLIER_HEAVY,
  TRAINING_PRESSURE_MULTIPLIER_MEDIUM,
  TRAINING_PRESSURE_MULTIPLIER_LIGHT,
  TRAINING_EFFECT_MULTIPLIER,
  PRESSURE_INCREASE_MULTIPLIER,
  ONLINE_CONTEST_TYPES,
  QUIT_PROB_BASE,
  QUIT_PROB_PER_EXTRA_PRESSURE,
  QUIT_PRESSURE_TRIGGER,
  QUIT_FORCE_AFTER_WEEKS
} from "../lib/constants.ts";
import {
  PROVINCES,
  getDifficultyById,
  getProvinceById,
  type ClimateProfile,
  type DifficultyConfig,
  type ProvinceConfig
} from "../lib/config.ts";
import { STUDENT_NAME_POOL } from "../data/studentNames.ts";
import { KNOWLEDGE, type CompetitionName, type KnowledgeType, type ProvinceStrength } from "../lib/enums.ts";
import type { TrainingTask } from "../data/trainingTasks.ts";
import { selectTrainingTasks } from "../data/trainingTasks.ts";
import {
  COMPETITION_BASE_CUTOFF,
  COMPETITION_ORDER,
  CUTOFF_FLUCTUATION,
  SEASON_WEEKS
} from "../lib/constants.ts";
import type { ContestConfig } from "./Contest.ts";

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

export type CampDifficulty = 1 | 2 | 3;
export interface CampSelection {
  difficulty: CampDifficulty;
  provinceId: number;
  studentNames: string[];
  inspireTalents?: string[];
}
export interface CampResult {
  success: true;
  cost: number;
  difficulty: CampDifficulty;
  provinceName: string;
  participants: string[];
  message: string;
  gains: Array<{
    name: string;
    thinking: number;
    coding: number;
    knowledge: Record<KnowledgeType, number>;
  }>;
  talentGains: Array<{
    name: string;
    talents: string[];
  }>;
}

export interface MockContestSetup {
  purchased?: boolean;
  onlineIndex?: number;
}

export interface MockContestResult {
  success: true;
  cost: number;
  label: string;
  config: ContestConfig;
  message: string;
}

export interface MockContestStartResult {
  success: true;
  cost: number;
  label: string;
  config: ContestConfig;
  participants: Student[];
  snapshots: Map<string, StudentSnapshot>;
}
export interface TrainingResult {
  name: string;
  multiplier: number;
  boosts: Array<{ type: KnowledgeType; baseAmount: number; actualAmount: number }>;
  thinkingGain: number;
  codingGain: number;
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
  logMessage?: (msg: string) => void;
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
  private namePool: string[] = [];

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

    this.refillNamePool();
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
      const student = new Student(this.drawStudentName(i), thinking, coding, mental);
      student.seatId = seatIds[i] ?? null;
      this.assignRandomTalent(student);
      applyTalentPassives(student);
      list.push(student);
    }
    return list;
  }

  private assignRandomTalent(student: Student): void {
    const pool = TALENTS.filter(t => t.name !== "__talent_cleanup__");
    if (pool.length === 0) return;
    const idx = Math.floor(Math.random() * pool.length);
    const choice = pool[idx]?.name as TalentName | undefined;
    if (choice) {
      student.addTalent(choice);
    }
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

  private refillNamePool(): void {
    const unique = Array.from(new Set(STUDENT_NAME_POOL));
    this.namePool = unique.slice();
    for (let i = this.namePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.namePool[i], this.namePool[j]] = [this.namePool[j], this.namePool[i]];
    }
  }

  private drawStudentName(idx: number): string {
    if (this.namePool.length === 0) {
      this.refillNamePool();
    }
    const name = this.namePool.pop();
    return name ?? `学生-${idx + 1}`;
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

  private handleQuitTendency(): void {
    const quitList: Student[] = [];
    const tendencyList: string[] = [];
    for (let i = this.students.length - 1; i >= 0; i--) {
      const s = this.students[i];
      if (!s || s.active === false) continue;
      if (s.pressure >= QUIT_PRESSURE_TRIGGER) {
        s.quit_tendency_weeks = (s.quit_tendency_weeks ?? 0) + 1;
        this.logMessage?.(`[警告] ${s.name} 压力 ${Math.round(s.pressure)} 产生退队倾向（持续 ${s.quit_tendency_weeks} 周）`);
        if (s.quit_tendency_weeks > 1) {
            if (s.quit_tendency_weeks >= QUIT_FORCE_AFTER_WEEKS) {
              this.logMessage?.(`[退队] ${s.name} 因连续高压 ${s.quit_tendency_weeks} 周被迫退队，声誉 -10`);
              quitList.push(s);
              this.students.splice(i, 1);
              s.active = false;
              s.quit_tendency_weeks = 0;
              s.seatId = null;
              this.quitStudents += 1;
              this.reputation = Math.max(0, this.reputation - 10);
              this.removeStudentVisuals(s);
              try { s.triggerTalents?.("quit", { reason: "burnout" }); } catch (e) {
                console.error("quit talent trigger failed", e);
              }
              continue;
            }
          let prob = QUIT_PROB_BASE + QUIT_PROB_PER_EXTRA_PRESSURE * Math.max(0, s.pressure - QUIT_PRESSURE_TRIGGER);
          prob += 0.2 * (s.quit_tendency_weeks - 1); // escalate each additional week
          if (s.talents.has("乐天派")) prob *= 0.5;
          const roll = Math.random();
          if (roll < prob) {
            quitList.push(s);
            this.students.splice(i, 1);
            s.active = false;
            s.quit_tendency_weeks = 0;
            s.seatId = null;
            this.quitStudents += 1;
            this.reputation = Math.max(0, this.reputation - 10);
            this.removeStudentVisuals(s);
            this.logMessage?.(`[退队] ${s.name} 因高压退队，声誉 -10`);
            try { s.triggerTalents?.("quit", { reason: "burnout" }); } catch (e) {
              console.error("quit talent trigger failed", e);
            }
            continue;
          }
        } else if (s.quit_tendency_weeks === 1) {
          tendencyList.push(s.name);
        }
      } else if (s.quit_tendency_weeks > 0) {
        s.quit_tendency_weeks = 0;
      }
    }

    if (tendencyList.length > 0) {
      this.logMessage?.(`[警告] ${tendencyList.join("、")} 压力过大产生退队倾向，如不缓解将在下周退队`);
    }
    if (quitList.length > 0) {
      const names = quitList.map((s) => s.name).join("、");
      const totalLoss = 10 * quitList.length;
      this.logMessage?.(`[退队] ${names} 因压力过大退队，声誉 -${totalLoss}`);
    }

    const activeCount = this.students.filter((s) => s && s.active !== false).length;
    if (activeCount === 0 && !this.gameEnded) {
      this.gameEnded = true;
      this.gameEndReason = "无学生：所有学生退队";
      this.seasonEndTriggered = true;
    }
  }

  private removeStudentVisuals(student: Student): void {
    if (!this.scene) return;
    const meshes = this.scene.userData?.playerMeshes as THREE.Object3D[] | undefined;
    if (!meshes) return;
    for (let i = meshes.length - 1; i >= 0; i--) {
      const root = meshes[i];
      const ref = root.userData?.studentRef as Student | undefined;
      if (ref === student) {
        root.parent?.remove(root);
        meshes.splice(i, 1);
      }
    }
  }

  private computeCampBaseCost(
    difficulty: CampDifficulty,
    provinceId: number,
    participantCount: number
  ): number {
    const base =
      difficulty === 2
        ? OUTFIT_BASE_COST_INTERMEDIATE
        : difficulty === 3
        ? OUTFIT_BASE_COST_ADVANCED
        : OUTFIT_BASE_COST_BASIC;
    const target =
      getProvinceById(provinceId) ??
      this.provinceConfig ??
      PROVINCES.find((p) => p.id === this.provinceId) ??
      PROVINCES[0];
    let adjustedBase = base;
    if (target.type === "STRONG") {
      adjustedBase = Math.floor(adjustedBase * STRONG_PROVINCE_COST_MULTIPLIER);
    } else if (target.type === "WEAK") {
      adjustedBase = Math.floor(adjustedBase * WEAK_PROVINCE_COST_MULTIPLIER);
    }

    const diffPenalty: Record<CampDifficulty, number> = { 1: 100, 2: 300, 3: 600 };
    const n = Math.max(0, Number(participantCount || 0));
    const raw = Math.max(0, Math.floor(adjustedBase + 18000 * n + (diffPenalty[difficulty] || 100)));

    const rep = clamp(this.reputation, 0, 100);
    const maxDiscount = OUTFIT_REPUTATION_DISCOUNT ?? 0.3;
    const multiplier = OUTFIT_REPUTATION_DISCOUNT_MULTIPLIER ?? 1.0;
    const discount = Math.min(0.5, (rep / 100) * maxDiscount * multiplier);
    return Math.max(0, Math.floor(raw * (1 - discount)));
  }

  computeCampCost(
    difficulty: CampDifficulty,
    provinceId: number,
    participantCount: number,
    talentCount: number
  ): { base: number; talent: number; total: number } {
    const base = this.computeCampBaseCost(difficulty, provinceId, participantCount);
    const talent = Math.max(0, talentCount * 12000);
    return { base, talent, total: base + talent };
  }

  performCamp(selection: CampSelection): CampResult | { success: false; error: string } {
    const province =
      getProvinceById(selection.provinceId) ??
      this.provinceConfig ??
      PROVINCES.find((p) => p.id === this.provinceId) ??
      PROVINCES[0];
    const participants = this.students.filter(
      (s) => s && s.active !== false && selection.studentNames.includes(s.name)
    );
    if (participants.length === 0) return { success: false, error: "请选择至少一名学生参加集训" };

    const inspireTalents = selection.inspireTalents ?? [];
    const costPreview = this.computeCampCost(
      selection.difficulty,
      province.id,
      participants.length,
      inspireTalents.length
    );
    let finalCost = costPreview.total;

    // Apply talent-based cost reductions
    try {
      for (const s of participants) {
        const results = s.triggerTalents?.("outing_cost_calculate", {
          province: province.name,
          difficulty: selection.difficulty,
          participantCount: participants.length
        });
        if (Array.isArray(results)) {
          for (const r of results) {
            const res = (r as { result?: unknown })?.result ?? r;
            if (
              res &&
              typeof res === "object" &&
              (res as { action?: string }).action === "reduce_outing_cost" &&
              typeof (res as { amount?: unknown }).amount === "number"
            ) {
              finalCost = Math.max(0, finalCost - Number((res as { amount: number }).amount));
            }
          }
        }
      }
    } catch {
      /* ignore reductions if talents throw */
    }

    if (this.budget < finalCost) {
      return { success: false, error: "经费不足，无法外出集训" };
    }
    const charged = this.recordExpense(finalCost, `外出集训：${province.name}`);

    const snapshots: Map<string, StudentSnapshot> = new Map();
    const initialTalents: Map<string, Set<string>> = new Map();
    for (const s of participants) {
      snapshots.set(s.name, snapshotStudent(s));
      initialTalents.set(s.name, new Set(s.talents));
    }

    const knowledgeBase =
      selection.difficulty === 2
        ? OUTFIT_KNOWLEDGE_BASE_INTERMEDIATE
        : selection.difficulty === 3
        ? OUTFIT_KNOWLEDGE_BASE_ADVANCED
        : OUTFIT_KNOWLEDGE_BASE_BASIC;
    const abilityBase =
      selection.difficulty === 2
        ? OUTFIT_ABILITY_BASE_INTERMEDIATE
        : selection.difficulty === 3
        ? OUTFIT_ABILITY_BASE_ADVANCED
        : OUTFIT_ABILITY_BASE_BASIC;
    const pressureBase =
      selection.difficulty === 2
        ? OUTFIT_PRESSURE_INTERMEDIATE
        : selection.difficulty === 3
        ? OUTFIT_PRESSURE_ADVANCED
        : OUTFIT_PRESSURE_BASIC;

    const knowledgeKeys: KnowledgeType[] = ["DS", "Graph", "String", "Math", "DP"];
    const abilityThreshold = selection.difficulty === 3 ? 260 : selection.difficulty === 2 ? 180 : 120;
    const trainingQuality = province.trainingQuality ?? 1.0;

    for (const s of participants) {
      const abilityScore =
        typeof s.getComprehensiveAbility === "function"
          ? s.getComprehensiveAbility()
          : (s.thinking + s.coding) / 2.0;
      const mismatch = abilityScore < abilityThreshold;
      const knowledgeGainRaw =
        uniform(knowledgeBase, knowledgeBase * 1.8) *
        (mismatch ? 0.5 : 1.0) *
        trainingQuality *
        OUTFIT_EFFECT_MULTIPLIER;
      const perType = Math.max(1, Math.floor(knowledgeGainRaw / knowledgeKeys.length));
      for (const k of knowledgeKeys) {
        s.addKnowledge(k, perType);
      }

      const abilityGain =
        uniform(abilityBase, abilityBase * 2.0) *
        (mismatch ? 0.6 : 1.0) *
        trainingQuality *
        OUTFIT_EFFECT_MULTIPLIER;
      s.addThinking(abilityGain);
      s.addCoding(abilityGain);
      s.mental = clamp(s.mental + abilityGain * 0.5, 0, 100);

      const pressureDelta = Math.floor(
        pressureBase * (mismatch ? 1.5 : 1.0) * PRESSURE_INCREASE_MULTIPLIER
      );
      s.pressure = clamp(s.pressure + pressureDelta, 0, 100);
      s.comfort = clamp(s.comfort - 10, 0, 100);

      try {
        s.triggerTalents?.("pressure_change", {
          source: "outing",
          amount: pressureDelta,
          province: province.name,
          difficulty: selection.difficulty
        });
        s.triggerTalents?.("outing_finished", {
          province: province.name,
          difficulty: selection.difficulty,
          knowledge_gain: knowledgeGainRaw
        });
      } catch {
        /* ignore talent errors */
      }

      if (inspireTalents.length > 0) {
        for (const talent of inspireTalents) {
          if (!s.hasTalent(talent) && Math.random() < 0.3) {
            s.addTalent(talent);
          }
        }
      }
    }

    this.weeksSinceEntertainment += 1;
    this.advanceWeeks(1);

    const perStudentGains = participants.map((s) => {
      const before = snapshots.get(s.name);
      const after = snapshotStudent(s);
      return {
        name: s.name,
        thinking: before ? after.thinking - before.thinking : 0,
        coding: before ? after.coding - before.coding : 0,
        knowledge: before
          ? (Object.keys(after.knowledge) as KnowledgeType[]).reduce<Record<KnowledgeType, number>>(
              (acc, key) => {
                acc[key] = after.knowledge[key] - (before.knowledge[key] ?? 0);
                return acc;
              },
              { DS: 0, Graph: 0, String: 0, Math: 0, DP: 0 }
            )
          : after.knowledge
      };
    });

    const talentGains = participants.map((s) => {
      const before = initialTalents.get(s.name) ?? new Set<string>();
      const newly = Array.from(s.talents).filter((t) => !before.has(t));
      return { name: s.name, talents: newly };
    });

    return {
      success: true,
      cost: charged,
      difficulty: selection.difficulty,
      provinceName: province.name,
      participants: participants.map((p) => p.name),
      message: "外出集训完成",
      gains: perStudentGains,
      talentGains
    };
  }

  startMockContest(
    setup: MockContestSetup
  ): MockContestStartResult | { success: false; error: string } {
    const participants = this.students.filter((s) => s && s.active !== false);
    if (participants.length === 0) return { success: false, error: "没有可参赛的学生" };
    const knowledgeTags = Object.values(KNOWLEDGE);

    const randomTags = (): string[] => {
      const cnt = 1 + Math.floor(Math.random() * 2);
      const chosen: string[] = [];
      while (chosen.length < cnt) {
        const pick = knowledgeTags[Math.floor(Math.random() * knowledgeTags.length)];
        if (!chosen.includes(pick)) chosen.push(pick);
      }
      return chosen;
    };

    let contestConfig: ContestConfig | null = null;
    let label = "";
    let cost = 0;

    const idx = Math.min(Math.max(0, setup.onlineIndex ?? 0), ONLINE_CONTEST_TYPES.length - 1);
    const contestType = ONLINE_CONTEST_TYPES[idx] ?? ONLINE_CONTEST_TYPES[0];
    const numProblems = Math.max(1, contestType.numProblems);
    const perScore = 100;
    contestConfig = {
      name: contestType.displayName,
      duration: 240,
      isMock: true,
      onlineContestType: contestType.name,
      problems: Array.from({ length: numProblems }, (_, problemIdx) => ({
        id: problemIdx,
        tags: randomTags(),
        difficulty: contestType.difficulty,
        maxScore: perScore,
        subtasks: [{ score: perScore, difficulty: contestType.difficulty }]
      }))
    };
    label = `${contestType.displayName} 网赛`;

    if (!contestConfig) return { success: false, error: "无法生成模拟赛配置" };

    const snapshots: Map<string, StudentSnapshot> = new Map();
    participants.forEach((s) => snapshots.set(s.name, snapshotStudent(s)));

    return { success: true, cost, label, config: contestConfig, participants, snapshots };
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
      this.handleQuitTendency();
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

    const adjustedCost = option.cost;
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
    const task = this.weeklyTrainingTasks.find((t) => t.name === taskId) ?? this.weeklyTrainingTasks[0];
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

      s.thinking = Math.max(0, Number((s.thinking || 0) + thinkingGain));
      s.coding = Math.max(0, Number((s.coding || 0) + codingGain));

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
        boosts: boostResult.boosts,
        thinkingGain,
        codingGain
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

interface StudentSnapshot {
  thinking: number;
  coding: number;
  knowledge: Record<KnowledgeType, number>;
}

function snapshotStudent(student: Student): StudentSnapshot {
  const knowledge = {} as Record<KnowledgeType, number>;
  (Object.keys(student.knowledge) as KnowledgeType[]).forEach((k) => {
    knowledge[k] = Number(student.knowledge[k]) || 0;
  });
  return {
    thinking: Number(student.thinking || 0),
    coding: Number(student.coding || 0),
    knowledge
  };
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
