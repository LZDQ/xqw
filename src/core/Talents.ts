import type { EventType } from "../lib/enums";
import type { Student } from "./Student";

export type TalentKind = "positive" | "negative";

export interface TalentDefinition {
  name: string;
  description: string;
  color: string;
  prob: number;
  beneficial: boolean;
  kind: TalentKind;
  eventHandler?: (student: Student, event: EventType) => void;
}

export const TALENTS: readonly TalentDefinition[] = [
  { name: "冷静", description: "比赛开始时有较高概率在比赛中保持冷静，所有能力临时+20%。", color: "#4CAF50", prob: 0.1, beneficial: true, kind: "positive" },
  { name: "伽罗瓦", description: "遇到数学题时有概率爆发，数学知识与思维能力临时+50%。", color: "#FF9800", prob: 0.05, beneficial: true, kind: "positive" },
  { name: "爆发型", description: "连续换题两次后，下一题有较大概率爆发，知识点与思维能力临时翻倍。", color: "#E91E63", prob: 0.05, beneficial: true, kind: "positive" },
  { name: "心态稳定", description: "比赛中解题数达到 3 题后，心理素质提升 50%。", color: "#2196F3", prob: 0.1, beneficial: true, kind: "positive" },
  { name: "Ad-hoc大师", description: "思考阶段有小概率直接通过当前题目的最后一档部分分（即直接得满分）。", color: "#9C27B0", prob: 0.03, beneficial: true, kind: "positive" },
  { name: "稳扎稳打", description: "只按题目顺序从前到后做题（不会跳到靠后的题目）。", color: "#795548", prob: 0.3, beneficial: true, kind: "positive" },
  { name: "激进", description: "激进做题风格：思维能力大幅提升但心理素质下降，只尝试最后一档部分分。", color: "#F44336", prob: 0.05, beneficial: true, kind: "positive" },
  { name: "数据结构狂热者", description: "若选中题标签含 '数据结构'，在模拟赛中本题临时使 数据结构能力 翻倍（x2）。", color: "#00BCD4", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "图论直觉", description: "在模拟赛选题时若题目含 '图论' 标签，有 30% 概率临时增加 图论 +60% 和 思维 +20%。", color: "#3F51B5", prob: 0.05, beneficial: true, kind: "positive" },
  { name: "赛场狂热", description: "比赛前半段（前 50% 题目）思维 +25%，后半段心理素质 constmental 衰减至 0.8 倍。", color: "#FF5722", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "最后一搏", description: "在比赛最后一题触发，临时提升所有 knowledge +100%（模拟赛中生效）。", color: "#CDDC39", prob: 0.05, beneficial: true, kind: "positive" },
  { name: "跳跃思维", description: "每跳题一次，思维 +10%，可叠加（最多 3 层，模拟赛中临时生效）。", color: "#009688", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "偏科", description: "比赛中偏科：随机将一个知识点 +200%，另一个 -50%。", color: "#673AB7", prob: 0.04, beneficial: true, kind: "positive" },
  { name: "摸鱼大师", description: "训练强度>80 时有50%概率触发：取消本次压力增加，但知识增益减少30%。", color: "#607D8B", prob: 0.15, beneficial: false, kind: "negative" },
  { name: "抗压奇才", description: "当压力增加超过10时自动触发：将本次压力增幅减半。", color: "#009688", prob: 0.12, beneficial: true, kind: "positive" },
  { name: "睡觉也在想题", description: "放假结束时概率触发：随机提升一项知识点，同时压力-5。", color: "#3F51B5", prob: 0.07, beneficial: true, kind: "positive" },
  { name: "高原反应", description: "在前往高原地区集训时压力翻倍。", color: "#795548", prob: 0.05, beneficial: false, kind: "negative" },
  { name: "电竞选手", description: "打游戲时，如果压力过大将直接退队去学电竞。", color: "#F57C00", prob: 0.02, beneficial: false, kind: "negative" },
  { name: "原题机（伪）", description: "模拟赛时所有能力巨幅提升，但是模拟赛效果归零", color: "#8BC34A", prob: 0.05, beneficial: false, kind: "negative" },
  { name: "卡卡就过了", description: "比赛时已取得本题得分>70分时，一定概率直接通过此题", color: "#FFC107", prob: 0.03, beneficial: true, kind: "positive" },
  { name: "林黛玉", description: "一直生病", color: "#E91E63", prob: 0.01, beneficial: false, kind: "negative" },
  { name: "追风者", description: "台风时压力清零", color: "#03A9F4", prob: 0.03, beneficial: true, kind: "positive" },
  { name: "慢热", description: "比赛初期能力受限，但随着时间推移逐渐进入状态。前半场思维与编程-20%，后半场+20%。", color: "#90A4AE", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "虎头蛇尾", description: "比赛开始时状态极佳，但耐力不足。前半场思维与心理+30%，后半场所有能力-20%。", color: "#FF6F00", prob: 0.08, beneficial: false, kind: "negative" },
  { name: "完美主义", description: "若比赛满分，则压力清零；否则压力增加。", color: "#9C27B0", prob: 0.05, beneficial: false, kind: "positive" },
  { name: "绝境逢生", description: "在比赛过半但得分仍为0时，有概率爆发，短时大幅提升能力。", color: "#D32F2F", prob: 0.04, beneficial: true, kind: "positive" },
  { name: "遇强则强", description: "挑战远超自己能力的题目时，反而会更兴奋。", color: "#1976D2", prob: 0.06, beneficial: true, kind: "positive" },
  { name: "遇弱则弱", description: "面对简单题目时容易粗心，导致发挥失常。", color: "#757575", prob: 0.06, beneficial: false, kind: "negative" },
  { name: "读题专家", description: "擅长理解题意，在思维检定上占有优势。", color: "#00897B", prob: 0.1, beneficial: true, kind: "positive" },
  { name: "键盘侠", description: "编码速度极快，在代码检定上占有优势。", color: "#5E35B1", prob: 0.1, beneficial: true, kind: "positive" },
  { name: "字符串魔法师", description: "对字符串处理有特殊技巧，编码能力和相关知识提升。", color: "#C2185B", prob: 0.05, beneficial: true, kind: "positive" },
  { name: "知识熔炉", description: "在比赛中解决题目时，可能触类旁通，临时提升其他知识点。", color: "#F4511E", prob: 0.04, beneficial: true, kind: "positive" },
  { name: "举一反三", description: "训练时效率更高，训练主知识点时，其他知识点也可能微小增长。", color: "#7CB342", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "注意力涣散", description: "学习效率低下，训练效果打折扣。", color: "#616161", prob: 0.05, beneficial: false, kind: "negative" },
  { name: "好奇宝宝", description: "训练时有概率\"走神\"去学别的，随机提升一项非目标知识。", color: "#26C6DA", prob: 0.06, beneficial: true, kind: "positive" },
  { name: "专注", description: "适合高强度训练，高强度下压力增长减缓；但讨厌低强度训练。", color: "#5C6BC0", prob: 0.07, beneficial: true, kind: "positive" },
  { name: "劳逸结合", description: "\"娱乐\"行动的效果翻倍。", color: "#66BB6A", prob: 0.1, beneficial: true, kind: "positive" },
  { name: "厌学", description: "压力较高时，训练可能完全无效并导致压力剧增。", color: "#6D4C41", prob: 0.04, beneficial: false, kind: "negative" },
  { name: "水土不服", description: "\"外出集训\"时容易不适应，效果下降且压力增加更多。", color: "#8D6E63", prob: 0.06, beneficial: false, kind: "negative" },
  { name: "乐天派", description: "天性乐观，每周压力自动恢复量增加，且不易\"燃尽\"。", color: "#FFA726", prob: 0.12, beneficial: true, kind: "positive" },
  { name: "悲观主义", description: "容易积累压力，比赛失利（未晋级）时压力惩罚加倍。", color: "#455A64", prob: 0.08, beneficial: false, kind: "negative" },
  { name: "铁人", description: "体质强健，因天气或高压导致生病的概率大幅降低。", color: "#78909C", prob: 0.1, beneficial: true, kind: "positive" },
  { name: "自愈", description: "生病时恢复速度加快。", color: "#81C784", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "压力转化", description: "压力越高，比赛中思维越活跃，但心理稳定性越差。", color: "#AB47BC", prob: 0.04, beneficial: false, kind: "positive" },
  { name: "扫把星", description: "运气不佳，更容易触发负面的团队运营事件。", color: "#424242", prob: 0.05, beneficial: false, kind: "negative" },
  { name: "省钱大师", description: "规划开支能手：若学生参加外出集训，则本次集训开支直接减少 5000。", color: "#43A047", prob: 0.06, beneficial: true, kind: "positive" },
  { name: "氪金玩家", description: "坚信付费的力量，\"付费模拟赛\"的效果显著提升。", color: "#FFD700", prob: 0.04, beneficial: true, kind: "positive" },
  { name: "天气敏感", description: "舒适度受天气影响剧烈，极端天气惩罚和良好天气增益都会加倍。", color: "#80DEEA", prob: 0.07, beneficial: false, kind: "negative" },
  { name: "美食家", description: "对食物异常执着，\"食堂\"设施等级对舒适度和压力恢复的影响翻倍。", color: "#FF8A65", prob: 0.08, beneficial: true, kind: "positive" },
  { name: "庸才", description: "资质平平，在训练中无法领悟任何新的天赋。", color: "#9E9E9E", prob: 0.03, beneficial: false, kind: "negative" },
  { name: "__talent_cleanup__", description: "内部：清理临时天赋效果", color: "#9E9E9E", prob: 0, beneficial: true, kind: "positive" }
] as const;

export type TalentName = (typeof TALENTS)[number]["name"];
