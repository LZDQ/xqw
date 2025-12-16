export const KNOWLEDGE = {
  DS: '数据结构',
  Graph: '图论',
  String: '字符串',
  Math: '数学',
  DP: '动态规划'
} as const;
export type KnowledgeType = keyof typeof KNOWLEDGE;

// Enumerations for province strength, competition names, and ability axes.

export const PROVINCE_STRENGTH = {
  STRONG: "强省",
  NORMAL: "普通省",
  WEAK: "弱省"
} as const;
export type ProvinceStrength = keyof typeof PROVINCE_STRENGTH;

export const COMPETITION_NAME = {
  CSP_S1: "CSP-S1",
  CSP_S2: "CSP-S2",
  NOIP: "NOIP",
  PROVINCIAL: "省选",
  NOI: "NOI",
  CTT_DAY1_2: "CTT-day1-2",
  CTT_DAY3_4: "CTT-day3-4",
  CTS: "CTS",
  IOI: "IOI"
} as const;
export type CompetitionName = keyof typeof COMPETITION_NAME;

export type EventKind = "random" | "choice" | "perStudent" | "system";
export interface EventType {
  name: string;
  description: string;
  kind: EventKind;
}
export const EVENTS: readonly EventType[] = [
  { name: "台风", description: "沿海省份夏秋季台风，影响舒适度/压力/经费", kind: "random" },
  { name: "感冒", description: "天气/舒适度导致学生生病", kind: "random" },
  { name: "退队/倦怠", description: "压力累计导致学生退队", kind: "random" },
  { name: "企业赞助", description: "声誉良好时获得企业赞助资金与声誉提升", kind: "random" },
  { name: "金牌教练来访", description: "知名教练莅临指导，学生能力提升，压力降低", kind: "random" },
  { name: "发现优质网课", description: "资料库等级越高，越容易发现优质网课", kind: "random" },
  { name: "构造题忘放checker", description: "练习结束后资料库等级低时可能忘记放置checker", kind: "random" },
  { name: "上级拨款", description: "比赛佳绩后获得额外经费与声誉提升", kind: "choice" },
  { name: "机房设备故障", description: "机房设备故障，产生维修费用或设置维修周数", kind: "random" },
  { name: "团队内部矛盾", description: "团队压力过高导致内部矛盾", kind: "random" },
  { name: "经费审计", description: "经费审计暂停高消费活动，并可能损失少量经费", kind: "random" },
  { name: "食堂卫生问题", description: "食堂卫生差，学生生病概率上升，舒适度下降", kind: "random" },
  { name: "友校交流邀请", description: "接受或拒绝友校交流邀请", kind: "choice" },
  { name: "学生自荐", description: "外省空降学生申请加入", kind: "choice" },
  { name: "媒体采访请求", description: "采访后可选择高调或低调", kind: "choice" },
  { name: "参加商业活动", description: "是否参加商业活动", kind: "choice" },
  { name: "跨省挖人邀请", description: "挖人邀请后选择挽留或不干涉", kind: "choice" },
  { name: "天赋获得", description: "学生在训练中可能获得新天赋", kind: "system" },
  { name: "天赋丧失", description: "压力过高可能导致学生丧失天赋", kind: "system" },
  { name: "课余项目", description: "学生在课余时间写了一个网页游戏", kind: "perStudent" },
  { name: "扑克牌", description: "学生用草稿纸做了一副扑克牌", kind: "perStudent" },
  { name: "三国杀", description: "学生做了猪国杀后用草稿纸做了一整套三国杀", kind: "perStudent" },
  { name: "臭水", description: "学生在机房养的臭水炸了", kind: "perStudent" },
  { name: "WMC", description: "学生用希沃白板打舞梦DX", kind: "perStudent" },
  { name: "蟋蟀", description: "学生的宿舍进了蛐蛐，叫了一晚上", kind: "perStudent" },
  { name: "florr", description: "学生发现了一款名为florr.io的游戏", kind: "perStudent" },
  { name: "冰与火之舞", description: "学生使用机械键盘大力游玩冰与火之舞", kind: "perStudent" },
  { name: "约跑", description: "学生晚上去操场跑步", kind: "perStudent" },
] as const;
