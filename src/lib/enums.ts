export const KNOWLEDGE = {
  DS: '数据结构',
  Graph: '图论',
  String: '字符串',
  Math: '数学',
  DP: '动态规划'
} as const;
export type KnowledgeType = typeof KNOWLEDGE[keyof typeof KNOWLEDGE];

// Enumerations for province strength, competition names, and ability axes.

export const PROVINCE_STRENGTH = {
  STRONG: "强省",
  NORMAL: "普通省",
  WEAK: "弱省"
} as const;
export type ProvinceStrength = typeof PROVINCE_STRENGTH[keyof typeof PROVINCE_STRENGTH];

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
export type CompetitionName = typeof COMPETITION_NAME[keyof typeof COMPETITION_NAME];

export const ABILITY_AXIS = {
  THINKING: "thinking",
  CODING: "coding"
} as const;
export type AbilityAxis = typeof ABILITY_AXIS[keyof typeof ABILITY_AXIS];
