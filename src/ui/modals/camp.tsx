import type { GameState, CampDifficulty } from "../../core/GameState.ts";
import { PROVINCES } from "../../lib/config.ts";
import { TALENTS } from "../../core/Talents.ts";
import { createCancelCircle, createConfirmCircle } from "./buttons.tsx";
import { renderStudentCard } from "../studentCard.ts";

interface CampModalProps {
  gameState: GameState;
  difficulty: CampDifficulty;
  provinceId: number;
  selectedStudents: Set<string>;
  selectedTalents: Set<string>;
  onSelectDifficulty: (difficulty: CampDifficulty) => void;
  onSelectProvince: (id: number) => void;
  onToggleStudent: (name: string) => void;
  onToggleTalent: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onNextStage: () => void;
  onPrevStage: () => void;
  stage: 1 | 2;
  costPreview: { base: number; talent: number; total: number };
  status?: string | null;
}

const CAMP_MODAL_STYLE = `
.camp-panel { max-width: 1200px; width:100%; display:flex; flex-direction:column; gap:14px; max-height:82vh; overflow:auto; }
.camp-panel.stage-two { max-height: none; overflow: visible; }
.pill-row { display:flex; gap:10px; flex-wrap:wrap; }
.pill { padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; cursor:pointer; font-weight:700; background:#fff; }
.pill.selected { border-color:#2563eb; color:#1d4ed8; box-shadow:0 0 0 2px rgba(37,99,235,0.15); }
.prov-grid { display:flex; flex-wrap:wrap; gap:8px; }
.prov-btn { padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; }
.prov-btn.selected { border-color:#2563eb; color:#1d4ed8; box-shadow:0 0 0 2px rgba(37,99,235,0.12); }
.student-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
.camp-student { cursor:pointer; padding:4px; border-radius:14px; transition: transform 140ms ease, box-shadow 160ms ease, background 160ms ease; }
.camp-student .student-overlay__header { justify-content:flex-start; flex-wrap:wrap; gap:8px; }
.camp-student .qualification-badge { margin-left:0; }
.camp-student .student-card { transform:none; max-width:none; box-shadow:0 6px 16px rgba(0,0,0,0.08); border:1px solid #e5e7eb; }
.camp-student:hover { transform: translateY(-2px); }
.camp-student:hover .student-card { box-shadow:0 12px 26px rgba(0,0,0,0.12); }
.camp-student.selected { background: linear-gradient(135deg, rgba(147,197,253,0.32), rgba(219,234,254,0.65)); box-shadow:0 0 0 3px rgba(147,197,253,0.85); }
.camp-student.selected .student-card { border-color:#93c5fd; box-shadow:0 10px 22px rgba(59,130,246,0.16); }
.talent-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; max-height:220px; overflow:auto; }
.talent-card { border:1px solid #e2e8f0; border-radius:8px; padding:8px; cursor:pointer; }
.talent-card.selected { border-color:#2563eb; box-shadow:0 2px 8px rgba(37,99,235,0.15); }
.helper { color:#666; font-size:13px; }
.section { border:1px solid #e5e7eb; border-radius:12px; padding:14px; background:#fff; }
.status-error { color:#b91c1c; font-weight:700; }
.sticky-actions { position:sticky; bottom:0; display:flex; justify-content:space-between; align-items:center; gap:12px; padding-top:10px; background:transparent; border-top:none; box-shadow:none; z-index:2; pointer-events:none; }
.sticky-actions > div { pointer-events:auto; }
`;

export function createCampModal({
  gameState,
  difficulty,
  provinceId,
  selectedStudents,
  selectedTalents,
  onSelectDifficulty,
  onSelectProvince,
  onToggleStudent,
  onToggleTalent,
  onConfirm,
  onCancel,
  onNextStage,
  onPrevStage,
  stage,
  costPreview,
  status
}: CampModalProps): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "panel camp-panel";
  if (stage === 2) {
    panel.classList.add("stage-two");
  }

  const style = document.createElement("style");
  style.textContent = CAMP_MODAL_STYLE;
  panel.appendChild(style);

  const heading = document.createElement("h3");
  heading.textContent = "外出集训（1周）";
  heading.style.margin = "0";
  heading.style.fontSize = "26px";
  heading.style.fontWeight = "800";
  panel.appendChild(heading);

  const helper = document.createElement("div");
  helper.className = "helper";
  helper.textContent =
    stage === 1
      ? "第 1 步：选择难度、地点与学生。"
      : "第 2 步：选择要激发的天赋（可选），查看费用后确认。";
  panel.appendChild(helper);

  if (stage === 1) {
    const diffRow = document.createElement("div");
    diffRow.className = "pill-row";
    ([
      [1, "基础班"],
      [2, "提高班"],
      [3, "冲刺班"]
    ] as Array<[CampDifficulty, string]>).forEach(([val, label]) => {
      const pill = document.createElement("div");
      pill.className = "pill";
      if (difficulty === val) pill.classList.add("selected");
      pill.textContent = label;
      pill.onclick = () => onSelectDifficulty(val);
      diffRow.appendChild(pill);
    });
    panel.appendChild(diffRow);
  }

  if (stage === 1) {
    const provinceSection = document.createElement("div");
    provinceSection.className = "section";
    const provLabel = document.createElement("div");
    provLabel.style.fontWeight = "700";
    provLabel.style.marginBottom = "8px";
    provLabel.textContent = "集训地点";
    provinceSection.appendChild(provLabel);

    const provGrid = document.createElement("div");
    provGrid.className = "prov-grid";
    PROVINCES.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "prov-btn";
      if (p.id === provinceId) btn.classList.add("selected");
      btn.textContent = p.name;
      btn.onclick = () => onSelectProvince(p.id);
      provGrid.appendChild(btn);
    });
    provinceSection.appendChild(provGrid);
    panel.appendChild(provinceSection);

    const studentSection = document.createElement("div");
    studentSection.className = "section";
    const stuLabel = document.createElement("div");
    stuLabel.style.fontWeight = "700";
    stuLabel.style.marginBottom = "8px";
    stuLabel.textContent = "选择学生";
    studentSection.appendChild(stuLabel);

    const grid = document.createElement("div");
    grid.className = "student-grid";
    const activeStudents = gameState.students.filter((s) => s && s.active !== false);
    activeStudents.forEach((s) => {
      const wrapper = document.createElement("div");
      wrapper.className = "camp-student";
      if (selectedStudents.has(s.name)) wrapper.classList.add("selected");

      const card = document.createElement("div");
      renderStudentCard(card, s, gameState, {
        includeQualification: true,
        className: "camp-student-card"
      });

      wrapper.onclick = () => onToggleStudent(s.name);
      wrapper.appendChild(card);
      grid.appendChild(wrapper);
    });
    studentSection.appendChild(grid);
    panel.appendChild(studentSection);
  } else {
    const talentSection = document.createElement("div");
    talentSection.className = "section";
    const talentLabel = document.createElement("div");
    talentLabel.style.fontWeight = "700";
    talentLabel.style.marginBottom = "6px";
    talentLabel.textContent = "天赋激发（¥12,000/个，可选）";
    talentSection.appendChild(talentLabel);

    const talentGrid = document.createElement("div");
    talentGrid.className = "talent-grid";
    TALENTS.filter((t) => t.name !== "__talent_cleanup__").forEach((talent) => {
      const card = document.createElement("div");
      card.className = "talent-card";
      if (selectedTalents.has(talent.name)) card.classList.add("selected");
      card.innerHTML = `<div style="font-weight:800;color:${talent.color}">${talent.name}</div>
        <div class="helper" style="margin-top:4px">${talent.description}</div>`;
      card.onclick = () => onToggleTalent(talent.name);
      talentGrid.appendChild(card);
    });
    talentSection.appendChild(talentGrid);
    panel.appendChild(talentSection);
  }

  const costRow = document.createElement("div");
  costRow.style.display = "flex";
  costRow.style.justifyContent = "space-between";
  costRow.style.alignItems = "center";
  costRow.innerHTML = `<div>预计费用：<strong>¥${costPreview.total.toLocaleString(
    "zh-CN"
  )}</strong>（基础 ¥${costPreview.base.toLocaleString("zh-CN")}${
    costPreview.talent > 0 ? ` + 天赋 ¥${costPreview.talent.toLocaleString("zh-CN")}` : ""
  }）</div><div class="helper">声誉越高折扣越多，经费：¥${gameState.budget.toLocaleString(
    "zh-CN"
  )}</div>`;
  panel.appendChild(costRow);

  if (status) {
    const statusRow = document.createElement("div");
    statusRow.className = "status-error";
    statusRow.textContent = status;
    panel.appendChild(statusRow);
  }

  const actionRow = document.createElement("div");
  actionRow.className = "sticky-actions";
  if (stage === 1) {
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "8px";
    left.appendChild(createCancelCircle(onCancel));
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.appendChild(createConfirmCircle(onNextStage));
    actionRow.appendChild(left);
    actionRow.appendChild(right);
  } else {
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "8px";
    left.appendChild(createCancelCircle(onPrevStage));
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.appendChild(createConfirmCircle(onConfirm));
    actionRow.appendChild(left);
    actionRow.appendChild(right);
  }
  panel.appendChild(actionRow);

  return panel;
}
