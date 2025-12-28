import type { Student } from "./Student.ts";
import type { KnowledgeType } from "../lib/enums.ts";

interface PassiveEffect {
  thinking?: number;
  coding?: number;
  mental?: number;
  pressure?: number;
  knowledge?: Partial<Record<KnowledgeType, number>>;
}

export function applyTalentPassives(student: Student): void {
  if (!student.talents) return;
  if (!student.talentPassivesApplied) student.talentPassivesApplied = new Set();

  for (const talent of student.talents) {
    if (talent === "__talent_cleanup__") continue;
    if (student.talentPassivesApplied.has(talent)) continue;
    const effect = buildEffect(talent);
    applyEffect(student, effect);
    student.talentPassivesApplied.add(talent);
  }
}

function buildEffect(talent: string): PassiveEffect {
  const randKnowledge = (): KnowledgeType => {
    const keys: KnowledgeType[] = ["DS", "Graph", "String", "Math", "DP"];
    return keys[Math.floor(Math.random() * keys.length)];
  };

  switch (talent) {
  case "冷静": return { mental: 10 };
  case "伽罗瓦": return { thinking: 5, knowledge: { Math: 20 } };
  case "爆发型": return { thinking: 12, coding: 12 };
  case "心态稳定": return { mental: 15 };
  case "Ad-hoc大师": return { coding: 15 };
  case "稳扎稳打": return { mental: 5, knowledge: { DP: 5 } };
  case "激进": return { thinking: 15, mental: -12 };
  case "数据结构狂热者": return { knowledge: { DS: 25 } };
  case "图论直觉": return { knowledge: { Graph: 25 } };
  case "赛场狂热": return { thinking: 8, mental: 8 };
  case "最后一搏": return { knowledge: { DS: 10, Graph: 10, String: 10, Math: 10, DP: 10 } };
  case "跳跃思维": return { thinking: 15 };
  case "偏科": {
    const up = randKnowledge();
    let down = randKnowledge();
    while (down === up) down = randKnowledge();
    return { knowledge: { [up]: 25, [down]: -10 } };
  }
  case "摸鱼大师": return { pressure: -8 };
  case "抗压奇才": return { pressure: -12 };
  case "睡觉也在想题": return { pressure: -5, knowledge: { [randKnowledge()]: 15 } };
  case "高原反应": return { mental: -12 };
  case "电竞选手": return { coding: 12, mental: -10 };
  case "原题机（伪）": return { thinking: 5, knowledge: { DS: 5, Graph: 5, String: 5, Math: 5, DP: 5 } };
  case "卡卡就过了": return { coding: 10 };
  case "林黛玉": return { mental: -18 };
  case "追风者": return { pressure: -10 };
  case "慢热": return { thinking: 5, coding: 5, mental: -5 };
  case "虎头蛇尾": return { thinking: 8, mental: -5 };
  case "完美主义": return { pressure: 6 };
  case "绝境逢生": return { mental: 10 };
  case "遇强则强": return { thinking: 10 };
  case "遇弱则弱": return { mental: -6 };
  case "读题专家": return { thinking: 12 };
  case "键盘侠": return { coding: 18 };
  case "字符串魔法师": return { knowledge: { String: 25 } };
  case "知识熔炉": return { knowledge: { DS: 6, Graph: 6, String: 6, Math: 6, DP: 6 } };
  case "举一反三": return { knowledge: { DS: 8, Graph: 8, String: 8, Math: 8, DP: 8 } };
  case "注意力涣散": return { thinking: -8, coding: -8 };
  case "好奇宝宝": return { knowledge: { [randKnowledge()]: 12 } };
  case "专注": return { pressure: -6 };
  case "劳逸结合": return { pressure: -4, mental: 4 };
  case "厌学": return { pressure: 12 };
  case "水土不服": return { mental: -8 };
  case "乐天派": return { pressure: -10, mental: 6 };
  case "悲观主义": return { mental: -5, pressure: 5 };
  case "铁人": return { mental: 10 };
  case "自愈": return { mental: 8 };
  case "压力转化": return { thinking: 6, mental: -6 };
  case "扫把星": return { pressure: 8 };
  case "省钱大师": return { pressure: -4 };
  case "氪金玩家": return { coding: 6 };
  case "天气敏感": return { mental: -5 };
  case "美食家": return { pressure: -5 };
  case "庸才": return { thinking: -10, coding: -10, knowledge: { DS: -10, Graph: -10, String: -10, Math: -10, DP: -10 } };
  default: return {};
  }
}

function applyEffect(student: Student, effect: PassiveEffect): void {
  const clamp = (n: number): number => Math.max(0, n);
  if (typeof effect.thinking === "number") student.thinking = clamp(student.thinking + effect.thinking);
  if (typeof effect.coding === "number") student.coding = clamp(student.coding + effect.coding);
  if (typeof effect.mental === "number") student.mental = clamp(student.mental + effect.mental);
  if (typeof effect.pressure === "number") student.pressure = clamp(student.pressure + effect.pressure);

  if (effect.knowledge) {
    for (const [k, delta] of Object.entries(effect.knowledge)) {
      const key = k as KnowledgeType;
      const change = Number(delta ?? 0);
      student.knowledge[key] = clamp(student.knowledge[key] + change);
    }
  }
}
