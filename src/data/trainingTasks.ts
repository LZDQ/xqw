import type { KnowledgeType } from "../lib/enums.ts";
import { KNOWLEDGE } from "../lib/enums.ts";

export interface TrainingTask {
  id: string;
  name: string;
  difficulty: number;
  boosts: Array<{ type: KnowledgeType; amount: number }>;
}

const POOL: TrainingTask[] = [
  { id: "t1", name: "[AtCoder ABC] Kadomatsu Sequence", difficulty: 120, boosts: [{ type: "DP", amount: 22 }, { type: "Math", amount: 12 }] },
  { id: "t2", name: "[CF Div.2] Tree Cutting", difficulty: 150, boosts: [{ type: "Graph", amount: 24 }, { type: "DS", amount: 18 }] },
  { id: "t3", name: "[洛谷] 数论基础", difficulty: 110, boosts: [{ type: "Math", amount: 28 }] },
  { id: "t4", name: "[JOI] 字符串匹配", difficulty: 140, boosts: [{ type: "String", amount: 26 }, { type: "DS", amount: 14 }] },
  { id: "t5", name: "[NOIP] 动态规划强化", difficulty: 165, boosts: [{ type: "DP", amount: 35 }, { type: "Math", amount: 10 }] },
  { id: "t6", name: "[USACO] 图论进阶", difficulty: 175, boosts: [{ type: "Graph", amount: 32 }, { type: "DS", amount: 16 }] },
  { id: "t7", name: "[AtCoder ARC] 字符串与数据结构", difficulty: 190, boosts: [{ type: "String", amount: 30 }, { type: "DS", amount: 20 }] },
  { id: "t8", name: "[CF Div.1] 数据结构专题", difficulty: 200, boosts: [{ type: "DS", amount: 36 }, { type: "Graph", amount: 14 }] },
  { id: "t9", name: "[IOI] 高阶动态规划", difficulty: 210, boosts: [{ type: "DP", amount: 40 }, { type: "Math", amount: 16 }] },
  { id: "t10", name: "[省选] 数学与图论", difficulty: 185, boosts: [{ type: "Math", amount: 34 }, { type: "Graph", amount: 18 }] }
];

export function selectTrainingTasks(count = 6, avgAbility = 120): TrainingTask[] {
  const scored = POOL.map((task) => {
    const diff = Math.abs(task.difficulty - avgAbility);
    return { task, score: diff };
  });
  scored.sort((a, b) => a.score - b.score);
  const chosen = scored.slice(0, count);
  if (chosen.length < count) {
    POOL.forEach((task) => {
      if (chosen.some((c) => c.task.id === task.id)) return;
      chosen.push({ task, score: Math.random() * 100 });
    });
  }
  return chosen.slice(0, count).map((c) => c.task);
}

export const KNOWLEDGE_COLORS: Record<KnowledgeType, string> = {
  DS: "#7c3aed",
  Graph: "#2563eb",
  String: "#10b981",
  Math: "#f59e0b",
  DP: "#ef4444"
};

export function knowledgeLabel(type: KnowledgeType): string {
  return KNOWLEDGE[type];
}
