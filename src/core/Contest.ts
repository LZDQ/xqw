import { Student } from "./Student.ts";
import type { GameState } from "./GameState.ts";
import {
  CONTEST_GAIN_RATIOS,
  CONTEST_MAX_TOTAL_CODING_GAIN,
  CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN,
  CONTEST_MAX_TOTAL_THINKING_GAIN,
  DIFFICULTY_TO_SKILL_SLOPE,
  ONLINE_CONTEST_TYPES
} from "../lib/constants.ts";
import type { KnowledgeType } from "../lib/enums.ts";

export const TICK_INTERVAL = 10; // minutes per tick, matches legacy contest sim

export interface ContestSubtask {
  score: number;
  difficulty: number;
  thinkingDifficulty?: number;
  codingDifficulty?: number;
}

export interface ContestProblem {
  id: number;
  tags: string[];
  difficulty: number;
  maxScore: number;
  subtasks: ContestSubtask[];
}

export interface ContestConfig {
  name: string;
  duration: number; // minutes
  problems: ContestProblem[];
  isMock?: boolean;
  onlineContestType?: string;
}

export type ContestLogType = "info" | "talent" | "solve" | "select" | "skip";

export interface ContestLog {
  tick: number;
  time: number;
  message: string;
  type: ContestLogType;
  studentName?: string;
  timestamp: number;
}

interface ContestProblemState extends ContestProblem {
  currentSubtask: number;
  maxScoreEarned: number;
  solved: boolean;
  mistakePenalty?: number;
  mistakeReason?: string;
}

export class ContestStudentState {
  student: Student;
  problems: ContestProblemState[];
  currentTarget: number | null = null;
  totalScore = 0;
  thinkingTime = 0; // minutes on current target
  recentlySkippedProblems: Set<number> = new Set();
  tick = 0;
  totalTicks = 0;
  custom: Record<string, unknown> = {};
  userData?: Record<string, unknown>;

  constructor(student: Student, problems: ContestProblem[]) {
    this.student = student;
    this.problems = problems.map((p) => ({
      ...p,
      currentSubtask: 0,
      maxScoreEarned: 0,
      solved: false
    }));
  }

  getProblem(id: number): ContestProblemState | undefined {
    return this.problems.find((p) => p.id === id);
  }

  getUnsolvedProblems(): ContestProblemState[] {
    return this.problems.filter((p) => !p.solved);
  }

  getNextProblem(): number | null {
    const unsolved = this.getUnsolvedProblems();
    if (unsolved.length === 0) return null;
    const eligible = unsolved.filter((p) => !this.recentlySkippedProblems.has(p.id));
    const list = eligible.length > 0 ? eligible : unsolved;
    list.sort((a, b) => a.id - b.id);
    return list[0]?.id ?? null;
  }

  updateScore(problemId: number, newScore: number): void {
    const prob = this.getProblem(problemId);
    if (!prob) return;
    if (newScore > prob.maxScoreEarned) {
      this.totalScore += newScore - prob.maxScoreEarned;
      prob.maxScoreEarned = newScore;
      if (newScore >= prob.maxScore) {
        this.markSolved(problemId, newScore);
      }
    }
  }

  markSolved(problemId: number, score?: number): void {
    const prob = this.getProblem(problemId);
    if (!prob) return;
    prob.solved = true;
    prob.currentSubtask = prob.subtasks.length;
    prob.maxScoreEarned = Math.max(prob.maxScoreEarned, score ?? prob.maxScore);
    this.totalScore = this.problems.reduce((sum, p) => sum + p.maxScoreEarned, 0);
  }

  resetSkipLock(): void {
    this.recentlySkippedProblems.clear();
  }
}

export class Contest {
  config: ContestConfig;
  students: ContestStudentState[];
  currentTick = 0;
  maxTicks: number;
  logs: ContestLog[] = [];
  private finalized = false;

  constructor(contestConfig: ContestConfig, students: Student[]) {
    this.config = contestConfig;
    this.students = students.map((s) => new ContestStudentState(s, contestConfig.problems));
    this.maxTicks = Math.max(1, Math.floor(contestConfig.duration / TICK_INTERVAL));
  }

  tick(): boolean {
    if (this.currentTick >= this.maxTicks) return false;
    for (const state of this.students) {
      state.tick = this.currentTick;
      state.totalTicks = this.maxTicks;
      this.simulateStudentTick(state);
    }
    this.currentTick += 1;
    return this.currentTick < this.maxTicks;
  }

  updateGameState(gameState: GameState): void {
    if (this.currentTick < this.maxTicks) {
      throw new Error("contest not finished yet");
    }
    this.finalizeResults();
    // gameState will be used when promotion/qualification pipeline is wired
    void gameState;

    // Apply mock gains (lightweight, matches legacy ratios)
    const ratioKey = (() => {
      if (this.config.isMock && this.config.onlineContestType) {
        const def = ONLINE_CONTEST_TYPES.find((o) => o.name === this.config.onlineContestType);
        const difficulty = def?.difficulty ?? 200;
        if (difficulty <= 160) return "online_low";
        if (difficulty >= 320) return "online_high";
        return "online_medium";
      }
      return this.config.name;
    })();
    const ratio = CONTEST_GAIN_RATIOS[ratioKey] ?? CONTEST_GAIN_RATIOS.online_medium;

    for (const state of this.students) {
      const gainKnowledge = CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN * ratio.knowledge;
      const gainThinking = CONTEST_MAX_TOTAL_THINKING_GAIN * ratio.thinking;
      const gainCoding = CONTEST_MAX_TOTAL_CODING_GAIN * ratio.coding;

      const perType = gainKnowledge / Object.keys(state.student.knowledge).length;
      for (const key of Object.keys(state.student.knowledge) as KnowledgeType[]) {
        state.student.addKnowledge(key, perType);
      }
      state.student.addThinking(gainThinking);
      state.student.addCoding(gainCoding);
      // slight pressure relief after contest
      state.student.pressure = Math.max(0, state.student.pressure - 12);
    }

    // TODO: integrate qualification progression when the rest of the contest pipeline is wired.
  }

  finalizeResults(): void {
    if (this.finalized) return;
    const MISTAKE_BASE_PROBABILITY = 0.15;
    const MISTAKE_MIN_PROBABILITY = 0.02;
    const MISTAKE_CODING_FACTOR = 0.0013;
    const MISTAKE_MIN_PENALTY = 0.1;
    const MISTAKE_MAX_PENALTY = 1.0;
    const MISTAKE_REASONS = [
      "边界条件处理不当",
      "数组越界",
      "忘记特判",
      "long long 写成 int"
    ];

    for (const state of this.students) {
      for (const prob of state.problems) {
        if (!prob.maxScoreEarned || prob.maxScoreEarned <= 0) continue;
        const coding = Math.max(0, Math.min(200, Number(state.student.coding || 0)));
        const mistakeProbability = Math.max(
          MISTAKE_MIN_PROBABILITY,
          MISTAKE_BASE_PROBABILITY - coding * MISTAKE_CODING_FACTOR
        );
        if (Math.random() < mistakeProbability) {
          const penaltyRatio =
            MISTAKE_MIN_PENALTY + Math.random() * (MISTAKE_MAX_PENALTY - MISTAKE_MIN_PENALTY);
          const penalty = Math.floor(prob.maxScoreEarned * penaltyRatio);
          const reason = MISTAKE_REASONS[Math.floor(Math.random() * MISTAKE_REASONS.length)];
          prob.mistakePenalty = penalty;
          prob.mistakeReason = reason;
          prob.maxScoreEarned = Math.max(0, prob.maxScoreEarned - penalty);
          this.addLog({
            tick: this.currentTick,
            time: this.currentTick * TICK_INTERVAL,
            type: "skip",
            studentName: state.student.name,
            message: `${state.student.name} 在 T${prob.id + 1} 上失误：${reason}，扣除 ${penalty} 分`
          });
        }
      }
      state.totalScore = state.problems.reduce((sum, p) => sum + p.maxScoreEarned, 0);
    }
    this.finalized = true;
  }

  private simulateStudentTick(state: ContestStudentState): void {
    // pick target if needed
    const needsTarget =
      state.currentTarget === null ||
      (state.currentTarget !== null && state.getProblem(state.currentTarget)?.solved);
    if (needsTarget) {
      const next = this.selectProblem(state);
      if (next === null || next === undefined) {
        return;
      }
      state.currentTarget = next;
      state.thinkingTime = 0;
      this.addLog({
        tick: this.currentTick,
        time: this.currentTick * TICK_INTERVAL,
        type: "select",
        studentName: state.student.name,
        message: `${state.student.name} 开始做 T${next + 1}`
      });
    }

    const prob = state.currentTarget !== null ? state.getProblem(state.currentTarget) : null;
    if (!prob || prob.solved) {
      state.currentTarget = null;
      state.thinkingTime = 0;
      return;
    }

    state.thinkingTime += TICK_INTERVAL;

    const subtaskIdx = this.selectBestSubtask(state.student, prob, state.thinkingTime);
    if (subtaskIdx === null) {
      state.currentTarget = null;
      state.thinkingTime = 0;
      return;
    }
    const subtask = prob.subtasks[subtaskIdx];
    const beforeScore = prob.maxScoreEarned;
    const success = this.attemptSubtask(state.student, prob, subtask);
    if (success) {
      state.updateScore(prob.id, subtask.score);
      prob.currentSubtask = Math.max(prob.currentSubtask, subtaskIdx + 1);
      const isAC = prob.maxScoreEarned >= prob.maxScore;
      this.addLog({
        tick: this.currentTick,
        time: this.currentTick * TICK_INTERVAL,
        type: isAC ? "solve" : "info",
        studentName: state.student.name,
        message: isAC
          ? `${state.student.name} AC 了 T${prob.id + 1}！得分：${prob.maxScoreEarned}`
          : `${state.student.name} 通过 T${prob.id + 1} 的第 ${subtaskIdx + 1} 档，得分 ${prob.maxScoreEarned}`
      });
      state.thinkingTime = 0;
    } else {
      const shouldSkip = this.shouldSkipProblem(state, prob);
      this.addLog({
        tick: this.currentTick,
        time: this.currentTick * TICK_INTERVAL,
        type: "info",
        studentName: state.student.name,
        message: `${state.student.name} 尝试 T${prob.id + 1} 第 ${subtaskIdx + 1} 档失败`
      });
      if (shouldSkip) {
        state.recentlySkippedProblems.add(prob.id);
        this.addLog({
          tick: this.currentTick,
          time: this.currentTick * TICK_INTERVAL,
          type: "skip",
          studentName: state.student.name,
          message: `${state.student.name} 在 T${prob.id + 1} 上卡住太久，决定跳题`
        });
        state.currentTarget = null;
        state.thinkingTime = 0;
      }
    }

    // enforce state.totalScore consistency
    const gained = state.problems.reduce((sum, p) => sum + p.maxScoreEarned, 0);
    state.totalScore = Math.max(gained, state.totalScore, beforeScore);
  }

  private selectProblem(state: ContestStudentState): number | null {
    // Allow talents to override the selector per instance
    if (typeof state.getNextProblem === "function") {
      const next = state.getNextProblem();
      if (next !== null && next !== undefined) return next;
    }
    const unsolved = state.getUnsolvedProblems();
    if (!unsolved.length) return null;
    unsolved.sort((a, b) => a.id - b.id);
    return unsolved[0].id;
  }

  private selectBestSubtask(
    student: Student,
    prob: ContestProblemState,
    thinkingTime: number
  ): number | null {
    if (!prob.subtasks.length) return null;
    const knowledge = this.getKnowledgeForProblem(student, prob);
    const thinking = Number(student.thinking || 50);
    const coding = Number(student.coding || 50);

    const scored = prob.subtasks.map((st, idx) => {
      const tDiff = Number(st.thinkingDifficulty ?? st.difficulty);
      const cDiff = Number(st.codingDifficulty ?? st.difficulty);
      const thinkingRatio = (thinking + knowledge * 0.5) / Math.max(1, tDiff);
      const codingRatio = (coding + knowledge * 0.3) / Math.max(1, cDiff);
      const matchScore = Math.max(10, thinkingRatio * 100) + Math.max(10, codingRatio * 100);
      const scoreWeight = st.score * 0.6;
      const penalty = st.score <= prob.maxScoreEarned ? -40 : 0;
      return { idx, score: matchScore + scoreWeight + penalty, thinkingRatio, codingRatio };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const isHard = top.thinkingRatio < 0.7 || top.codingRatio < 0.7;
    if (isHard && thinkingTime > 30) {
      const lower = scored.find((s) => s.idx < prob.subtasks.length - 1);
      if (lower) return lower.idx;
    }
    return top?.idx ?? 0;
  }

  private attemptSubtask(
    student: Student,
    problem: ContestProblemState,
    subtask: ContestSubtask
  ): boolean {
    const knowledge = this.getKnowledgeForProblem(student, problem);
    const knowledgeRequirement = Math.max(15, subtask.difficulty * 0.35);
    let knowledgePenalty = 1.0;
    if (knowledge < knowledgeRequirement) {
      const gap = knowledgeRequirement - knowledge;
      knowledgePenalty = Math.max(0.05, Math.exp(-gap / 15.0));
    }

    const tDiff = subtask.thinkingDifficulty ?? subtask.difficulty;
    const cDiff = subtask.codingDifficulty ?? subtask.difficulty;

    const thinkingBase = (student.thinking || 50) + knowledge * 0.5;
    const codingBase = (student.coding || 50) + knowledge * 0.3;
    const mental = student.getMentalIndex();

    const thinkingProb = sigmoid((thinkingBase - tDiff * DIFFICULTY_TO_SKILL_SLOPE) / 12) *
      (0.75 + 0.25 * (mental / 100)) *
      knowledgePenalty;
    const codingProb = sigmoid((codingBase - cDiff * DIFFICULTY_TO_SKILL_SLOPE) / 12) *
      (0.8 + 0.2 * (mental / 100)) *
      knowledgePenalty;

    const thinkingPass = Math.random() < clamp(thinkingProb, 0.03, 0.98);
    const codingPass = Math.random() < clamp(codingProb, 0.03, 0.98);
    return thinkingPass && codingPass;
  }

  private shouldSkipProblem(state: ContestStudentState, prob: ContestProblemState): boolean {
    const ability = state.student.getComprehensiveAbility
      ? state.student.getComprehensiveAbility()
      : 50;
    const knowledge = this.getKnowledgeForProblem(state.student, prob);
    const effective = ability + knowledge * 0.5;
    const easiest = prob.subtasks.reduce(
      (min, st) => (!min || st.difficulty < min.difficulty ? st : min),
      prob.subtasks[0]
    );
    const gap = (easiest?.difficulty ?? prob.difficulty) - effective;
    let threshold = 70;
    if (gap > 50) threshold = 20;
    else if (gap > 30) threshold = 35;
    else if (gap > 10) threshold = 50;
    return state.thinkingTime >= threshold;
  }

  private getKnowledgeForProblem(student: Student, problem: ContestProblem): number {
    if (!problem.tags || problem.tags.length === 0) return 0;
    const map: Record<string, KnowledgeType> = {
      数据结构: "DS",
      图论: "Graph",
      字符串: "String",
      数学: "Math",
      DP: "DP",
      动态规划: "DP"
    };
    let total = 0;
    let count = 0;
    for (const tag of problem.tags) {
      const key = map[tag];
      if (key && typeof student.knowledge[key] === "number") {
        total += student.knowledge[key];
        count++;
      }
    }
    if (count === 0) return 0;
    return total / count;
  }

  private addLog(log: Omit<ContestLog, "timestamp">): void {
    this.logs.push({ ...log, timestamp: Date.now() });
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
