import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import type * as THREEType from "three";
import type { GameState } from "../core/GameState.ts";
import type { Student } from "../core/Student.ts";
import { TALENTS } from "../core/Talents.ts";
import type { KnowledgeType, CompetitionName } from "../lib/enums.ts";
import { KNOWLEDGE, COMPETITION_NAME } from "../lib/enums.ts";
import {
  COMPETITION_ORDER,
  COMPETITION_SCHEDULE,
  type Competition,
  SEASON_WEEKS
} from "../lib/constants.ts";
import { getLetterGradeAbility } from "../lib/grades.ts";

type Hit = {
  target: THREEType.Object3D;
} | null;

interface QualificationStatus {
  label: string;
  qualified: boolean;
}

const TALENT_LOOKUP = new Map(TALENTS.map(t => [t.name, t]));

export class StudentLabel {
  private THREE: typeof THREEType;
  private cssScene: THREEType.Scene;
  private camera: THREEType.Camera;
  private gameState: GameState;
  private object: CSS3DObject | null = null;
  private rootEl: HTMLElement | null = null;
  private currentAnchor: THREEType.Object3D | null = null;
  private lastSignature: string | null = null;

  constructor(THREE: typeof THREEType, cssScene: THREEType.Scene, camera: THREEType.Camera, gameState: GameState) {
    this.THREE = THREE;
    this.cssScene = cssScene;
    this.camera = camera;
    this.gameState = gameState;
  }

  setTarget(hit: Hit): void {
    if (!hit) {
      this.hide();
      return;
    }
    const anchor = this.getAnchor(hit.target);
    const student = this.getStudentFromObject(hit.target);
    if (!anchor || !student) {
      this.hide();
      return;
    }
    this.ensureObject();
    this.currentAnchor = anchor;
    this.renderContent(student);
    this.updateTransform();
    if (this.object && !this.object.parent) {
      this.cssScene.add(this.object);
    }
    if (this.object) {
      this.object.visible = true;
    }
  }

  tick(): void {
    if (!this.object || !this.currentAnchor) return;
    this.updateTransform();
  }

  hide(): void {
    this.currentAnchor = null;
    this.lastSignature = null;
    if (this.object) {
      this.object.visible = false;
    }
  }

  private ensureObject(): void {
    if (this.object && this.rootEl) return;
    this.rootEl = document.createElement("div");
    this.rootEl.className = "student-overlay";
    this.rootEl.style.pointerEvents = "none";
    const obj = new CSS3DObject(this.rootEl);
    obj.scale.setScalar(0.004);
    this.object = obj;
  }

  private getAnchor(obj: THREEType.Object3D): THREEType.Object3D | null {
    let cur: THREEType.Object3D | null = obj;
    while (cur) {
      if (cur.userData?.studentRef || cur.userData?.studentName) return cur;
      cur = cur.parent;
    }
    return null;
  }

  private getStudentFromObject(obj: THREEType.Object3D): Student | null {
    let cur: THREEType.Object3D | null = obj;
    while (cur) {
      const ref = cur.userData?.studentRef as Student | undefined;
      if (ref) return ref;
      const name = cur.userData?.studentName as string | undefined;
      if (name) {
        const found = this.gameState.students.find(s => s.name === name);
        if (found) return found;
      }
      cur = cur.parent;
    }
    return null;
  }

  private updateTransform(): void {
    if (!this.object || !this.currentAnchor) return;
    const pos = new this.THREE.Vector3();
    this.currentAnchor.getWorldPosition(pos);
    const offset = typeof this.currentAnchor.userData?.labelOffset === "number"
      ? this.currentAnchor.userData.labelOffset
      : 1.6;
    pos.y += offset;
    this.object.position.copy(pos);
    this.object.lookAt(this.camera.position);
  }

  private renderContent(student: Student): void {
    if (!this.rootEl) return;
    const qual = getQualificationStatus(this.gameState, student);
    const signature = this.buildSignature(student, qual);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    this.rootEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "student-overlay__header";
    const nameEl = document.createElement("div");
    nameEl.className = "student-overlay__name";
    nameEl.textContent = student.name;
    header.appendChild(nameEl);
    const qualEl = document.createElement("span");
    qualEl.className = `qualification-badge ${qual.qualified ? "qualified" : "not-qualified"}`;
    qualEl.textContent = qual.label;
    header.appendChild(qualEl);
    this.rootEl.appendChild(header);

    const knowledgeSection = document.createElement("div");
    knowledgeSection.className = "student-overlay__section";
    const knowledgeLabel = document.createElement("span");
    knowledgeLabel.className = "student-overlay__label";
    knowledgeLabel.textContent = "知识";
    knowledgeSection.appendChild(knowledgeLabel);
    const knowledgeBadges = document.createElement("div");
    knowledgeBadges.className = "knowledge-badges";
    knowledgeBadges.appendChild(this.createAbilityBadge("思维", Math.floor(student.thinking)));
    knowledgeBadges.appendChild(this.createAbilityBadge("代码", Math.floor(student.coding)));
    for (const [key, label] of Object.entries(KNOWLEDGE)) {
      const value = Math.floor(student.knowledge[key as KnowledgeType] ?? 0);
      knowledgeBadges.appendChild(this.createKnowledgeBadge(label, value));
    }
    knowledgeSection.appendChild(knowledgeBadges);
    this.rootEl.appendChild(knowledgeSection);

    const talentsSection = document.createElement("div");
    talentsSection.className = "student-overlay__section";
    const talentsLabel = document.createElement("span");
    talentsLabel.className = "student-overlay__label";
    talentsLabel.textContent = "天赋";
    talentsSection.appendChild(talentsLabel);
    const talentWrap = document.createElement("div");
    talentWrap.className = "student-talents";
    Array.from(student.talents).forEach(talentName => {
      talentWrap.appendChild(this.createTalentTag(talentName));
    });
    talentsSection.appendChild(talentWrap);
    this.rootEl.appendChild(talentsSection);
  }

  private buildSignature(student: Student, qual: QualificationStatus): string {
    const knowledgeVals = Object.keys(KNOWLEDGE)
      .map(key => Math.floor(student.knowledge[key as KnowledgeType] ?? 0))
      .join("|");
    const talents = Array.from(student.talents).join(",");
    return [
      student.name,
      Math.floor(student.thinking),
      Math.floor(student.coding),
      knowledgeVals,
      talents,
      qual.label,
    ].join("::");
  }

  private createAbilityBadge(label: string, value: number): HTMLElement {
    const badge = document.createElement("span");
    const grade = getLetterGradeAbility(value);
    badge.className = "kb ability";
    badge.dataset.grade = grade;
    badge.title = `${label}: ${value}`;
    badge.textContent = `${label} ${grade}`;
    return badge;
  }

  private createKnowledgeBadge(label: string, value: number): HTMLElement {
    const badge = document.createElement("span");
    const grade = getLetterGradeAbility(value);
    badge.className = "kb";
    badge.dataset.grade = grade;
    badge.title = `${label}: ${value}`;
    badge.textContent = `${label} ${grade}`;
    return badge;
  }

  private createTalentTag(name: string): HTMLElement {
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
}

function getWeekInSeason(week: number): number {
  return ((Math.max(1, week) - 1) % SEASON_WEEKS) + 1;
}

function getNextContest(gameState: GameState): Competition | null {
  const weekInSeason = getWeekInSeason(gameState.week);
  const sorted = [...COMPETITION_SCHEDULE].sort((a, b) => a.week - b.week);
  return sorted.find(c => c.week > weekInSeason) ?? null;
}

function getPreviousCompetitionName(name: CompetitionName): CompetitionName | null {
  const idx = COMPETITION_ORDER.indexOf(name);
  if (idx <= 0) return null;
  return COMPETITION_ORDER[idx - 1] ?? null;
}

function getQualificationStatus(gameState: GameState, student: Student): QualificationStatus {
  const next = getNextContest(gameState);
  if (!next) {
    return { qualified: true, label: "本赛季无后续比赛" };
  }
  const displayName = COMPETITION_NAME[next.name] ?? next.name;
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
