import { Student } from "./Student.ts";
import type { GameState } from "./GameState.ts";
import type { CompetitionName } from "../lib/enums.ts";
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
  gainMultiplier?: number;
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
    const totalMaxScore = this.config.problems.reduce((sum, p) => sum + p.maxScore, 0);
    const results = this.students.map((s) => ({
      student: s.student,
      totalScore: s.totalScore,
      maxScore: totalMaxScore,
    }));
    if (!this.config.isMock) {
      gameState.updateQualifications(this.config.name as CompetitionName, results);
    }

    const activeCount = gameState.students.filter((s) => s && s.active !== false).length;
    if (gameState.getSeasonIndexForWeek() === 1 && activeCount === 0) {
      gameState.gameEnded = true;
      gameState.gameEndReason = "所有学生淘汰，游戏结束（第二年）";
      gameState.seasonEndTriggered = true; // TODO: hook end screen
    }

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

    const gainMultiplier = this.config.gainMultiplier ?? 1;
    for (const state of this.students) {
      const gainKnowledge = CONTEST_MAX_TOTAL_KNOWLEDGE_GAIN * ratio.knowledge * gainMultiplier;
      const gainThinking = CONTEST_MAX_TOTAL_THINKING_GAIN * ratio.thinking * gainMultiplier;
      const gainCoding = CONTEST_MAX_TOTAL_CODING_GAIN * ratio.coding * gainMultiplier;

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
    // Allow talents to override the selector per instance
    const unsolved = state.getUnsolvedProblems();
    if (!unsolved.length) return null;

    const scored = unsolved.map((p) => {
      const easiest = p.subtasks.reduce((min, st) => (!min || st.difficulty < min.difficulty ? st : min), p.subtasks[0]);
      const knowledge = this.getKnowledgeForProblem(state.student, p);
      const ability = state.student.getComprehensiveAbility ? state.student.getComprehensiveAbility() : 50;
      const effectiveAbility = ability + knowledge * 0.5;
      const difficultyGap = easiest.difficulty - effectiveAbility;
      let baseScore = 100;
      if (difficultyGap <= -20) baseScore += 80;
      else if (difficultyGap <= 0) baseScore += 60;
      else if (difficultyGap <= 20) baseScore += 40;
      else if (difficultyGap <= 40) baseScore += 20;
      else baseScore += 10;
      const positionBonus = 40 - p.id * 8;
      baseScore += Math.max(0, positionBonus);
      return { id: p.id, weight: Math.max(1, baseScore) };
    });

    const totalWeight = scored.reduce((sum, item) => sum + item.weight, 0);
    let random = getRandom() * totalWeight;
    for (const item of scored) {
      random -= item.weight;
      if (random <= 0) {
        return item.id;
      }
    }
    return scored[0].id;
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

    const availableSubtasks = prob.subtasks.map((st, idx) => ({ subtask: st, idx }));
    const scored = availableSubtasks.map((item) => {
      const st = item.subtask;
      const thinkingDiff = Number(st.thinkingDifficulty ?? st.difficulty ?? 0);
      const codingDiff = Number(st.codingDifficulty ?? st.difficulty ?? 0);
      const thinkingRatio = (thinking + knowledge * 0.5) / Math.max(1, thinkingDiff);
      const codingRatio = (coding + knowledge * 0.3) / Math.max(1, codingDiff);

      let matchScore = 0;
      if (thinkingRatio >= 0.6 && thinkingRatio <= 1.4) matchScore += 100;
      else if (thinkingRatio > 1.4) matchScore += Math.max(60, 100 - (thinkingRatio - 1.4) * 40);
      else matchScore += Math.max(10, thinkingRatio * 100);

      if (codingRatio >= 0.6 && codingRatio <= 1.4) matchScore += 100;
      else if (codingRatio > 1.4) matchScore += Math.max(60, 100 - (codingRatio - 1.4) * 40);
      else matchScore += Math.max(10, codingRatio * 100);

      const scoreWeight = st.score * 0.8;
      const scorePenalty = prob.maxScoreEarned > 0 && st.score <= prob.maxScoreEarned ? -50 : 0;
      const totalScore = matchScore + scoreWeight + scorePenalty;
      return { idx: item.idx, score: totalScore, subtask: st, thinkingRatio, codingRatio };
    });

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const isLastSubtask = best.idx === prob.subtasks.length - 1;
    const cannotSolveFullScore = isLastSubtask && (best.thinkingRatio < 0.7 || best.codingRatio < 0.7);
    let thinkingTimeFactor = 0;
    if (thinkingTime >= 20) {
      thinkingTimeFactor = Math.min(0.8, (thinkingTime - 20) / 40);
    }
    const shouldDowngrade = cannotSolveFullScore || getRandom() < thinkingTimeFactor;

    if (shouldDowngrade) {
      const lowerSubtasks = scored.filter((s) => s.idx < prob.subtasks.length - 1);
      if (lowerSubtasks.length > 0) {
        const rescored = lowerSubtasks.map((s) => {
          const thinkingMatch = Math.abs(1.0 - s.thinkingRatio);
          const codingMatch = Math.abs(1.0 - s.codingRatio);
          const thinkingScore = Math.exp(-thinkingMatch * 2.0);
          const codingScore = Math.exp(-codingMatch * 2.0);
          const matchQuality = (thinkingScore + codingScore) / 2.0;
          let difficultyPenalty = 0;
          if (s.thinkingRatio > 1.5 || s.codingRatio > 1.5) {
            const overpower = Math.max(s.thinkingRatio - 1.5, s.codingRatio - 1.5, 0);
            difficultyPenalty = -overpower * 0.3;
          }
          if (s.thinkingRatio < 0.6 || s.codingRatio < 0.6) {
            const tooHard = Math.max(0.6 - s.thinkingRatio, 0.6 - s.codingRatio, 0);
            difficultyPenalty -= tooHard * 0.5;
          }
          const totalSubtasks = prob.subtasks.length;
          const relativePos = s.idx / Math.max(1, totalSubtasks - 1);
          let positionScore = 0;
          if (relativePos >= 0.4 && relativePos <= 0.7) positionScore = 0.15;
          else if (relativePos < 0.4) positionScore = 0.1 - (0.4 - relativePos) * 0.2;
          else positionScore = 0.1 - (relativePos - 0.7) * 0.3;

          let timeAdjustment = 0;
          if (thinkingTime > 30) {
            const extraTime = Math.min(thinkingTime - 30, 60);
            timeAdjustment = (1.0 - relativePos) * (extraTime / 60) * 0.15;
          }

          const totalScore = matchQuality + difficultyPenalty + positionScore + timeAdjustment;
          return { ...s, partialScore: totalScore, positionScore };
        });

        rescored.sort((a, b) => b.partialScore - a.partialScore);
        const downgradeProb = cannotSolveFullScore ? 0.85 : 0.5 + thinkingTimeFactor * 0.3;
        if (getRandom() < downgradeProb) {
          const selected = rescored[0];
          const abilityRatio = ((selected.thinkingRatio + selected.codingRatio) / 2.0).toFixed(2);
          this.addLogMessage(
            `${student.name} ${cannotSolveFullScore ? "发现正解太难" : `卡题${thinkingTime}分钟`}，决定先做部分分（档位 ${
              selected.idx + 1
            }/${prob.subtasks.length}，能力/难度比≈${abilityRatio}）`,
            "info",
            student.name
          );
          return selected.idx;
        }
      }
    }

    const rand = getRandom();
    if (rand < 0.8 && scored.length > 0) return scored[0].idx;
    if (rand < 0.95 && scored.length > 1) return scored[1].idx;
    const randIdx = Math.floor(getRandom() * scored.length);
    return scored[randIdx].idx;
  }

  private attemptSubtask(
    student: Student,
    problem: ContestProblemState,
    subtask: ContestSubtask
  ): boolean {
    const knowledge = this.getKnowledgeForProblem(student, problem);
    const ability = student.getComprehensiveAbility ? student.getComprehensiveAbility() : 50;
    let mental = student.getMentalIndex();
    const tDiff = Number(subtask.thinkingDifficulty ?? subtask.difficulty ?? 0);
    const cDiff = Number(subtask.codingDifficulty ?? subtask.difficulty ?? 0);

    const knowledgeRequirement = Math.max(15, tDiff * 0.35);
    let knowledgePenalty = 1.0;
    if (knowledge < knowledgeRequirement) {
      const gap = knowledgeRequirement - knowledge;
      knowledgePenalty = Math.max(0.05, Math.exp(-gap / 15.0));
    }

    const thinkingBase = Number(student.thinking || 50) + knowledge * 0.5;
    const codingBase = Number(student.coding || 50) + knowledge * 0.3;
    let thinkingProb = sigmoid((thinkingBase - tDiff * DIFFICULTY_TO_SKILL_SLOPE) / 12);
    const thinkingStability = 0.75 + 0.25 * (mental / 100.0);
    thinkingProb *= thinkingStability;
    thinkingProb *= knowledgePenalty;

    let codingProb = sigmoid((codingBase - cDiff * DIFFICULTY_TO_SKILL_SLOPE) / 12);
    const codingStability = 0.8 + 0.2 * (mental / 100.0);
    codingProb *= codingStability;
    codingProb *= knowledgePenalty;

    try {
      const effectiveAbility = ability + knowledge * 0.5;
      if (problem && typeof problem.difficulty === "number" && problem.difficulty > 2.0 * effectiveAbility) {
        thinkingProb *= 0.45;
        codingProb *= 0.45;
        this.addLogMessage(
          `${student.name} 在 T${(problem.id ?? 0) + 1} 触发 难度压制：题目难度 ${problem.difficulty} > 2× 综合能力 ${effectiveAbility.toFixed(
            1
          )}，思维/代码通过概率被压制`,
          "info",
          student.name
        );
      }
    } catch (e) {
      void e;
    }

    thinkingProb = clamp(thinkingProb, 0.03, 0.98);
    codingProb = clamp(codingProb, 0.03, 0.98);

    const thinkingPass = getRandom() < thinkingProb;
    const codingPass = getRandom() < codingProb;

    try {
      const tPct = (thinkingProb * 100).toFixed(1);
      const cPct = (codingProb * 100).toFixed(1);
      const kPenaltyPct = (knowledgePenalty * 100).toFixed(1);
      let logMsg = `${student.name} 尝试 T${(problem.id ?? 0) + 1} 档位：思维通过 ${thinkingPass} (${tPct}%)，代码通过 ${codingPass} (${cPct}%)`;
      if (knowledgePenalty < 0.95) {
        logMsg += `，知识点惩罚 ${kPenaltyPct}% (知识${knowledge.toFixed(1)}/需求${knowledgeRequirement.toFixed(1)})`;
      }
      this.addLogMessage(logMsg, "info", student.name);
    } catch (e) {
      void e;
    }
    return thinkingPass && codingPass;
  }

  private shouldSkipProblem(state: ContestStudentState, prob: ContestProblemState): boolean {
    const ability = state.student.getComprehensiveAbility ? state.student.getComprehensiveAbility() : 50;
    const knowledge = this.getKnowledgeForProblem(state.student, prob);
    const effective = ability + knowledge * 0.5;
    const easiest = prob.subtasks.reduce(
      (min, st) => (!min || st.difficulty < min.difficulty ? st : min),
      prob.subtasks[0]
    );
    const gap = (easiest?.difficulty ?? prob.difficulty) - effective;
    let timeThreshold;
    if (gap > 50) timeThreshold = 20;
    else if (gap > 30) timeThreshold = 35;
    else if (gap > 10) timeThreshold = 50;
    else timeThreshold = 70;
    if (state.thinkingTime >= timeThreshold) {
      const overtimeRatio = (state.thinkingTime - timeThreshold) / 30.0;
      const skipProb = Math.min(0.7, 0.3 + overtimeRatio * 0.1);
      return getRandom() < skipProb;
    }
    return false;
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

  private addLogMessage(message: string, type: ContestLogType = "info", studentName?: string): void {
    this.addLog({
      tick: this.currentTick,
      time: this.currentTick * TICK_INTERVAL,
      message,
      type,
      studentName,
    });
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function getRandom(): number {
  return Math.random();
}
