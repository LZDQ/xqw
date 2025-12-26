import type { GameState, RelaxOption, RelaxOptionId } from "../../core/GameState.ts";

const RELAX_MODAL_STYLE = `
.option-card{transition:all 180ms ease;border:1px solid #e6e6e6;background:#fff}
.option-card:hover{transform:translateY(-2px);box-shadow:0 4px 10px rgba(0,0,0,0.04)}
.option-card.selected{border-color:#2b6cb0;background:linear-gradient(180deg, rgba(43,108,176,0.04), rgba(43,108,176,0.02));box-shadow:none;transform:none}
.relax-status{font-size:15px;color:#555;font-weight:700;}
.relax-status.error{color:#b00020;}
.relax-status.success{color:#0f5132;}
`;

interface RelaxModalProps {
  gameState: GameState;
  selectedId: RelaxOptionId;
  onSelect: (id: RelaxOptionId) => void;
  onConfirm: (id: RelaxOptionId) => void;
  onCancel: () => void;
  status?: string | null;
}

function renderOptionCard(
  opt: RelaxOption,
  selectedId: RelaxOptionId,
  onSelect: (id: RelaxOptionId) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "prov-card option-card";
  card.dataset.id = String(opt.id);
  card.style.minWidth = "200px";
  card.style.border = "1px solid #ddd";
  card.style.padding = "16px";
  card.style.borderRadius = "10px";
  card.style.cursor = "pointer";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = opt.label;
  title.style.fontSize = "24px";
  title.style.fontWeight = "800";
  card.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card-desc small muted";
  desc.textContent = opt.desc;
  desc.style.fontSize = "16px";
  desc.style.lineHeight = "1.6";
  card.appendChild(desc);

  if (opt.id === selectedId) card.classList.add("selected");

  card.onclick = () => {
    onSelect(opt.id);
  };

  return card;
}

export function createRelaxModal({
  gameState,
  selectedId,
  onSelect,
  onConfirm,
  onCancel,
  status
}: RelaxModalProps): HTMLElement {
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
  style.textContent = RELAX_MODAL_STYLE;
  panel.appendChild(style);

  const heading = document.createElement("h3");
  heading.textContent = "娱乐活动（1周）";
  heading.style.margin = "0";
  heading.style.fontSize = "28px";
  heading.style.fontWeight = "800";
  panel.appendChild(heading);

  const cardsWrapper = document.createElement("div");
  cardsWrapper.style.display = "grid";
  cardsWrapper.style.gridTemplateColumns = "repeat(2, minmax(260px, 1fr))";
  cardsWrapper.style.gap = "18px";
  cardsWrapper.style.alignItems = "stretch";

  const options = gameState.getRelaxOptions();
  options.forEach((opt) => {
    cardsWrapper.appendChild(renderOptionCard(opt, selectedId, onSelect));
  });
  panel.appendChild(cardsWrapper);

  if (status) {
    const statusBox = document.createElement("div");
    statusBox.className = "relax-status";
    if (status.includes("不足") || status.includes("需要")) {
      statusBox.classList.add("error");
    }
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

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-ghost";
  cancelBtn.textContent = "取消";
  cancelBtn.style.position = "absolute";
  cancelBtn.style.left = "0";
  cancelBtn.style.bottom = "0";
  cancelBtn.style.width = "64px";
  cancelBtn.style.height = "64px";
  cancelBtn.style.borderRadius = "50%";
  cancelBtn.style.fontSize = "18px";
  cancelBtn.style.fontWeight = "700";
  cancelBtn.onclick = () => onCancel();

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn";
  confirmBtn.id = "ent-confirm";
  confirmBtn.textContent = "确认";
  confirmBtn.style.position = "absolute";
  confirmBtn.style.right = "0";
  confirmBtn.style.bottom = "0";
  confirmBtn.style.width = "68px";
  confirmBtn.style.height = "68px";
  confirmBtn.style.borderRadius = "50%";
  confirmBtn.style.fontSize = "18px";
  confirmBtn.style.fontWeight = "800";
  confirmBtn.onclick = () => onConfirm(selectedId);

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  panel.appendChild(actions);

  return panel;
}
