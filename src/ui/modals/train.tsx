import type { GameState } from "../../core/GameState.ts";
import { KNOWLEDGE_COLORS, knowledgeLabel, type TrainingTask } from "../../data/trainingTasks.ts";
import {
  PRESSURE_THRESHOLD_HIGH,
  PRESSURE_THRESHOLD_MID,
  TRAINING_PRESSURE_MULTIPLIER_HEAVY,
  TRAINING_PRESSURE_MULTIPLIER_MEDIUM,
  TRAINING_PRESSURE_MULTIPLIER_LIGHT
} from "../../lib/constants.ts";
import { createCancelCircle, createConfirmCircle } from "./buttons.tsx";

const TRAIN_MODAL_STYLE = `
.train-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 16px;
}
.train-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  background: #fff;
  min-height: 140px;
}
.train-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
.train-card.selected { border-color: #2b6cb0; box-shadow: 0 0 0 2px rgba(43,108,176,0.12); }
.tag-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.tag { padding:4px 8px; border-radius: 12px; color:#fff; font-weight:800; font-size:14px; }
.intensity-row { margin-top: 10px; }
.status-badge { font-size: 14px; font-weight: 800; }
.status-badge.ok { color:#0f5132; }
.status-badge.warn { color:#d97706; }
.status-badge.risk { color:#b91c1c; }
`;

interface TrainModalProps {
  gameState: GameState;
  tasks: TrainingTask[];
  selectedTaskId: string;
  intensity: number;
  onSelect: (taskId: string) => void;
  onIntensityChange: (value: number) => void;
  onConfirm: (taskId: string, intensity: number) => void;
  onCancel: () => void;
  status?: string | null;
}

function estimatePressure(
  gameState: GameState,
  task: TrainingTask,
  intensity: number
): "ok" | "warn" | "risk" {
  const actives = gameState.students.filter((s) => s && s.active !== false);
  if (actives.length === 0) return "ok";
  const avgAbility =
    actives.reduce((sum, s) => sum + (s.thinking + s.coding) / 2, 0) / actives.length;
  let basePressure = intensity === 1 ? 15 : intensity === 2 ? 25 : 40;
  const difficultyPressure = Math.max(0, (task.difficulty - avgAbility) * 0.2);
  basePressure += difficultyPressure;
  if (intensity === 3) basePressure *= TRAINING_PRESSURE_MULTIPLIER_HEAVY;
  else if (intensity === 2) basePressure *= TRAINING_PRESSURE_MULTIPLIER_MEDIUM;
  else basePressure *= TRAINING_PRESSURE_MULTIPLIER_LIGHT;

  const weatherFactor = gameState.getWeatherFactor();
  const comfortFactor = 1.0 + Math.max(0.0, (50 - gameState.getComfort()) / 100.0);
  const canteenReduction = gameState.facilities.getCanteenPressureReduction();
  const preview = basePressure * weatherFactor * canteenReduction * comfortFactor;
  if (preview >= PRESSURE_THRESHOLD_HIGH) return "risk";
  if (preview >= PRESSURE_THRESHOLD_MID) return "warn";
  return "ok";
}

function renderTaskCard(
  task: TrainingTask,
  selected: boolean,
  onSelect: (id: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "train-card";
  if (selected) card.classList.add("selected");

  const title = document.createElement("div");
  title.style.fontSize = "22px";
  title.style.fontWeight = "800";
  title.textContent = task.name;
  card.appendChild(title);

  const diff = document.createElement("div");
  diff.style.fontSize = "16px";
  diff.style.fontWeight = "700";
  diff.style.marginTop = "6px";
  diff.textContent = `难度 ${task.difficulty}`;
  card.appendChild(diff);

  const tags = document.createElement("div");
  tags.className = "tag-row";
  task.boosts.forEach((b) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.style.background = KNOWLEDGE_COLORS[b.type];
    tag.textContent = `${knowledgeLabel(b.type)} +${b.amount}`;
    tags.appendChild(tag);
  });
  card.appendChild(tags);

  card.onclick = () => onSelect(task.id);
  return card;
}

export function createTrainModal({
  gameState,
  tasks,
  selectedTaskId,
  intensity,
  onSelect,
  onIntensityChange,
  onConfirm,
  onCancel,
  status
}: TrainModalProps): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.style.flex = "1 1 auto";
  panel.style.maxWidth = "1200px";
  panel.style.minHeight = "520px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "12px";
  panel.style.margin = "0 auto";

  const style = document.createElement("style");
  style.textContent = TRAIN_MODAL_STYLE;
  panel.appendChild(style);

  const heading = document.createElement("h3");
  heading.textContent = "选择训练题目";
  heading.style.margin = "0";
  heading.style.fontSize = "28px";
  heading.style.fontWeight = "800";
  panel.appendChild(heading);

  const subtitle = document.createElement("div");
  subtitle.className = "small muted";
  subtitle.style.fontSize = "16px";
  subtitle.textContent = "从下方 6 道题目中选择一题。难度和强度会影响知识提升与压力。";
  panel.appendChild(subtitle);

  const grid = document.createElement("div");
  grid.className = "train-grid";
  tasks.forEach((task) => {
    grid.appendChild(renderTaskCard(task, task.id === selectedTaskId, onSelect));
  });
  panel.appendChild(grid);

  const intensityRow = document.createElement("div");
  intensityRow.className = "intensity-row";
  intensityRow.style.display = "flex";
  intensityRow.style.flexDirection = "column";
  intensityRow.style.gap = "12px";

  const labels = ["轻度", "中度", "重度"];
  const labelRow = document.createElement("div");
  labelRow.style.display = "flex";
  labelRow.style.justifyContent = "space-between";
  labelRow.style.alignItems = "center";
  labelRow.style.maxWidth = "260px";
  labelRow.style.margin = "0 auto";
  labelRow.style.fontWeight = "700";
  labels.forEach((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.fontSize = "16px";
    labelRow.appendChild(span);
  });
  intensityRow.appendChild(labelRow);

  const selectorRow = document.createElement("div");
  selectorRow.style.display = "flex";
  selectorRow.style.alignItems = "center";
  selectorRow.style.justifyContent = "center";
  selectorRow.style.gap = "14px";

  const clampIntensity = (val: number): number => Math.min(3, Math.max(1, Math.round(val)));
  let currentIntensity = clampIntensity(intensity);

  const minusBtn = document.createElement("button");
  minusBtn.textContent = "−";
  minusBtn.style.width = "56px";
  minusBtn.style.height = "56px";
  minusBtn.style.borderRadius = "50%";
  minusBtn.style.fontSize = "24px";
  minusBtn.style.fontWeight = "900";
  minusBtn.style.border = "none";
  minusBtn.style.cursor = "pointer";
  minusBtn.style.background = "#e2e8f0";
  minusBtn.onclick = () => {
    const next = clampIntensity(currentIntensity - 1);
    setIntensity(next);
  };

  const dots = document.createElement("div");
  dots.style.display = "flex";
  dots.style.gap = "12px";
  dots.style.alignItems = "center";
  const dotEls: HTMLDivElement[] = [];
  for (let i = 1; i <= 3; i++) {
    const dot = document.createElement("div");
    dot.style.width = "18px";
    dot.style.height = "18px";
    dot.style.borderRadius = "50%";
    dot.style.background = i <= intensity ? "#2b6cb0" : "#cbd5e1";
    dot.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
    dot.dataset.val = String(i);
    dot.onclick = () => setIntensity(i);
    dotEls.push(dot);
    dots.appendChild(dot);
  }

  const plusBtn = document.createElement("button");
  plusBtn.textContent = "+";
  plusBtn.style.width = "56px";
  plusBtn.style.height = "56px";
  plusBtn.style.borderRadius = "50%";
  plusBtn.style.fontSize = "24px";
  plusBtn.style.fontWeight = "900";
  plusBtn.style.border = "none";
  plusBtn.style.cursor = "pointer";
  plusBtn.style.background = "#e2e8f0";
  plusBtn.onclick = () => {
    const next = clampIntensity(currentIntensity + 1);
    setIntensity(next);
  };

  selectorRow.appendChild(minusBtn);
  selectorRow.appendChild(dots);
  selectorRow.appendChild(plusBtn);
  intensityRow.appendChild(selectorRow);

  const previewStatus = document.createElement("div");
  previewStatus.style.textAlign = "center";
  previewStatus.style.fontSize = "16px";
  previewStatus.style.fontWeight = "800";
  const intensityCopy = ["轻度训练", "中度训练", "重度训练"];

  const statusClass = (): string => {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return "status-badge ok";
    const level = estimatePressure(gameState, task, currentIntensity);
    if (level === "risk") return "status-badge risk";
    if (level === "warn") return "status-badge warn";
    return "status-badge ok";
  };

  function setIntensity(val: number): void {
    currentIntensity = clampIntensity(val);
    onIntensityChange(currentIntensity);
    previewStatus.textContent = intensityCopy[currentIntensity - 1] ?? "";
    previewStatus.className = statusClass();
    dotEls.forEach((dot, idx) => {
      dot.style.background = idx < currentIntensity ? "#2b6cb0" : "#cbd5e1";
    });
  }

  previewStatus.textContent = intensityCopy[currentIntensity - 1] ?? "";
  previewStatus.className = statusClass();
  intensityRow.appendChild(previewStatus);

  panel.appendChild(intensityRow);

  if (status) {
    const statusBox = document.createElement("div");
    statusBox.style.fontSize = "15px";
    statusBox.style.fontWeight = "800";
    statusBox.style.color = status.includes("不足") ? "#b91c1c" : "#b45309";
    statusBox.textContent = status;
    panel.appendChild(statusBox);
  }

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.style.marginTop = "auto";
  actions.style.display = "flex";
  actions.style.alignItems = "center";
  actions.style.justifyContent = "space-between";
  actions.style.position = "relative";
  actions.style.paddingTop = "24px";

  const cancelBtn = createCancelCircle(() => onCancel());
  cancelBtn.style.position = "absolute";
  cancelBtn.style.left = "0";
  cancelBtn.style.bottom = "0";

  const confirmBtn = createConfirmCircle(() => onConfirm(selectedTaskId, currentIntensity));
  confirmBtn.id = "train-confirm";
  confirmBtn.style.position = "absolute";
  confirmBtn.style.right = "0";
  confirmBtn.style.bottom = "0";

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  panel.appendChild(actions);

  return panel;
}
