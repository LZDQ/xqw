import type { GameState } from "../core/GameState.ts";
import type { Student } from "../core/Student.ts";
import { TALENTS } from "../core/Talents.ts";
import type { CompetitionName, KnowledgeType } from "../lib/enums.ts";
import { KNOWLEDGE, COMPETITION_NAME } from "../lib/enums.ts";
import {
  COMPETITION_ORDER,
  COMPETITION_SCHEDULE,
  type Competition,
  SEASON_WEEKS
} from "../lib/constants.ts";
import { getLetterGradeAbility } from "../lib/grades.ts";

export interface QualificationStatus {
  label: string;
  qualified: boolean;
}

export interface StudentCardOptions {
  className?: string;
  includeQualification?: boolean;
  headerBadges?: HTMLElement[];
  showKnowledge?: boolean;
  showTalents?: boolean;
}

const TALENT_LOOKUP = new Map(TALENTS.map((t) => [t.name, t]));

export function renderStudentCard(
  container: HTMLElement,
  student: Student,
  gameState: GameState,
  options: StudentCardOptions = {}
): void {
  container.classList.add("student-card");
  if (options.className) {
    options.className
      .split(" ")
      .map(cls => cls.trim())
      .filter(Boolean)
      .forEach(cls => container.classList.add(cls));
  }
  container.replaceChildren();

  const header = document.createElement("div");
  header.className = "student-overlay__header";

  const nameEl = document.createElement("div");
  nameEl.className = "student-overlay__name";
  nameEl.textContent = student.name;
  header.appendChild(nameEl);

  if (options.includeQualification) {
    const qual = getQualificationStatus(gameState, student);
    header.appendChild(createQualificationBadge(qual));
  }

  options.headerBadges?.forEach((badge) => header.appendChild(badge));
  container.appendChild(header);

  if (options.showKnowledge !== false) {
    const knowledgeSection = document.createElement("div");
    knowledgeSection.className = "student-overlay__section";
    const knowledgeLabel = document.createElement("span");
    knowledgeLabel.className = "student-overlay__label";
    knowledgeLabel.textContent = "知识";
    knowledgeSection.appendChild(knowledgeLabel);
    const knowledgeBadges = document.createElement("div");
    knowledgeBadges.className = "knowledge-badges";
    knowledgeBadges.appendChild(createAbilityBadge("思维", Math.floor(student.thinking)));
    knowledgeBadges.appendChild(createAbilityBadge("代码", Math.floor(student.coding)));
    for (const [key, label] of Object.entries(KNOWLEDGE)) {
      const value = Math.floor(student.knowledge[key as KnowledgeType] ?? 0);
      knowledgeBadges.appendChild(createKnowledgeBadge(label, value));
    }
    knowledgeSection.appendChild(knowledgeBadges);
    container.appendChild(knowledgeSection);
  }

  if (options.showTalents !== false) {
    const talentsSection = document.createElement("div");
    talentsSection.className = "student-overlay__section";
    const talentsLabel = document.createElement("span");
    talentsLabel.className = "student-overlay__label";
    talentsLabel.textContent = "天赋";
    talentsSection.appendChild(talentsLabel);
    const talentWrap = document.createElement("div");
    talentWrap.className = "student-talents";
    Array.from(student.talents).forEach((talentName) => {
      talentWrap.appendChild(createTalentTag(talentName));
    });
    talentsSection.appendChild(talentWrap);
    container.appendChild(talentsSection);
  }
}

export function getQualificationStatus(gameState: GameState, student: Student): QualificationStatus {
  const next = getNextContest(gameState);
  if (!next) {
    return { qualified: true, label: "本赛季无后续比赛" };
  }
  const displayName = next.displayName ?? next.name;
  if (next.name === "CSP_S1") {
    return { qualified: true, label: `${displayName} 无需晋级` };
  }
  const prev = getPreviousCompetitionName(next.name);
  if (!prev) {
    return { qualified: true, label: `可参加 ${displayName}` };
  }
  const seasonIdx = gameState.getSeasonIndexForWeek();
  const set = gameState.qualification?.[seasonIdx]?.[prev];
  const qualified = Boolean(set && set.has(student.name));
  return {
    qualified,
    label: `${qualified ? "已晋级" : "未晋级"} ${displayName}`
  };
}

function createAbilityBadge(label: string, value: number): HTMLElement {
  const badge = document.createElement("span");
  const grade = getLetterGradeAbility(value);
  badge.className = "kb ability";
  badge.dataset.grade = grade;
  badge.title = `${label}: ${value}`;
  badge.textContent = `${label} ${grade}`;
  return badge;
}

function createKnowledgeBadge(label: string, value: number): HTMLElement {
  const badge = document.createElement("span");
  const grade = getLetterGradeAbility(value);
  badge.className = "kb";
  badge.dataset.grade = grade;
  badge.title = `${label}: ${value}`;
  badge.textContent = `${label} ${grade}`;
  return badge;
}

function createTalentTag(name: string): HTMLElement {
  const tag = document.createElement("span");
  tag.className = "talent-tag";
  const def = TALENT_LOOKUP.get(name);
  const color = def?.color ?? "#2b6cb0";
  tag.style.backgroundColor = `${color}20`;
  tag.style.color = color;
  tag.style.borderColor = `${color}40`;
  tag.textContent = name;
  const tooltip = document.createElement("span");
  tooltip.className = "talent-tooltip";
  tooltip.textContent = def?.description ?? "暂无描述";
  tag.appendChild(tooltip);
  return tag;
}

function createQualificationBadge(status: QualificationStatus): HTMLElement {
  const qualEl = document.createElement("span");
  qualEl.className = `qualification-badge ${status.qualified ? "qualified" : "not-qualified"}`;
  qualEl.textContent = status.label;
  return qualEl;
}

function getWeekInSeason(week: number): number {
  return ((Math.max(1, week) - 1) % SEASON_WEEKS) + 1;
}

function getNextContest(gameState: GameState): (Competition & { displayName?: string }) | null {
  const weekInSeason = getWeekInSeason(gameState.week);
  const sorted = [...COMPETITION_SCHEDULE].sort((a, b) => a.week - b.week);
  const next = sorted.find((c) => c.week > weekInSeason) ?? null;
  if (!next) return null;
  const displayName = COMPETITION_NAME[next.name] ?? next.name;
  return { ...next, displayName };
}

function getPreviousCompetitionName(name: CompetitionName): CompetitionName | null {
  const idx = COMPETITION_ORDER.indexOf(name);
  if (idx <= 0) return null;
  return COMPETITION_ORDER[idx - 1] ?? null;
}
