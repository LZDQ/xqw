import type { MockContestSetup } from "../../core/GameState.ts";
import { ONLINE_CONTEST_TYPES } from "../../lib/constants.ts";
import { createCancelCircle, createConfirmCircle } from "./buttons.tsx";

interface MockModalProps {
  onlineIndex: number;
  onSelectOnline: (idx: number) => void;
  onConfirm: (setup: MockContestSetup) => void;
  onCancel: () => void;
  status?: string | null;
}

const MOCK_MODAL_STYLE = `
.mock-panel { max-width: 1100px; width: 100%; display:flex; flex-direction:column; gap:14px; }
.section { border:1px solid #e5e7eb; border-radius:12px; padding:14px; background:#fff; }
.option-grid { display:flex; gap:10px; flex-wrap:wrap; }
.option-card { border:1px solid #e5e7eb; border-radius:10px; padding:12px; min-width:150px; cursor:pointer; transition:all 140ms ease; background:#fdfdfd; }
.option-card.selected { border-color:#2563eb; box-shadow:0 4px 12px rgba(37,99,235,0.15); background:#fff; }
.helper { font-size:13px; color:#666; }
.status-error { color:#b91c1c; font-weight:700; }
`;

export function createMockModal({
  onlineIndex,
  onSelectOnline,
  onConfirm,
  onCancel,
  status
}: MockModalProps): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "panel mock-panel";

  const style = document.createElement("style");
  style.textContent = MOCK_MODAL_STYLE;
  panel.appendChild(style);

  const heading = document.createElement("h3");
  heading.textContent = "安排网赛模拟（1周）";
  heading.style.margin = "0";
  heading.style.fontSize = "26px";
  heading.style.fontWeight = "800";
  panel.appendChild(heading);

  const helper = document.createElement("div");
  helper.className = "helper";
  helper.textContent = "选择一场网赛作为本周模拟赛，免费参与并提升能力。";
  panel.appendChild(helper);

  const section = document.createElement("div");
  section.className = "section";

  const label = document.createElement("div");
  label.style.fontWeight = "700";
  label.style.marginBottom = "8px";
  label.textContent = "选择网赛类型";
  section.appendChild(label);

  const grid = document.createElement("div");
  grid.className = "option-grid";
  ONLINE_CONTEST_TYPES.forEach((contest, idx) => {
    const card = document.createElement("div");
    card.className = "option-card";
    if (idx === onlineIndex) card.classList.add("selected");
    card.innerHTML = `<div style="font-weight:800">${contest.displayName}</div>
      <div class="helper" style="margin-top:4px">${contest.numProblems} 题 · 难度 ${contest.difficulty}</div>`;
    card.onclick = () => onSelectOnline(idx);
    grid.appendChild(card);
  });
  section.appendChild(grid);

  panel.appendChild(section);

  if (status) {
    const statusRow = document.createElement("div");
    statusRow.className = "status-error";
    statusRow.textContent = status;
    panel.appendChild(statusRow);
  }

  const actionRow = document.createElement("div");
  actionRow.style.display = "flex";
  actionRow.style.gap = "12px";
  actionRow.style.justifyContent = "flex-end";
  actionRow.appendChild(createCancelCircle(onCancel));
  actionRow.appendChild(
    createConfirmCircle(() =>
      onConfirm({
        onlineIndex
      })
    )
  );
  panel.appendChild(actionRow);

  return panel;
}
