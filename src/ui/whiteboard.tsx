import type { GameState, RelaxOptionId } from "../core/GameState.ts";
import { ACTIONS, type ActionType } from "../lib/enums.ts";
import { createRelaxModal } from "./modals/relax.tsx";

const BASE_GAME_WHITEBOARD_CSS = `
#whiteboard-content.whiteboard-ui {
  font-family: "PingFang SC", "Microsoft YaHei", Arial, Helvetica, sans-serif;
  color: #222;
  background: #f7f7f8;
  padding: 16px;
  margin: 0;
  box-sizing: border-box;
}
#whiteboard-content.whiteboard-ui * {
  box-sizing: border-box;
}
#whiteboard-content.whiteboard-ui header {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
#whiteboard-content.whiteboard-ui header h1 {
  margin: 0;
  font-size: 18px;
}
#whiteboard-content.whiteboard-ui .topline {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
#whiteboard-content.whiteboard-ui .small {
  font-size: 13px;
  color: #666;
}
#whiteboard-content.whiteboard-ui .muted {
  color: #666;
  opacity: 0.85;
}
#whiteboard-content.whiteboard-ui .row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
#whiteboard-content.whiteboard-ui .col {
  flex: 1;
  min-width: 240px;
}
#whiteboard-content.whiteboard-ui .panel {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
#whiteboard-content.whiteboard-ui .side-panel {
  flex: 0 0 360px;
}
#whiteboard-content.whiteboard-ui .flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#whiteboard-content.whiteboard-ui .action-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
#whiteboard-content.whiteboard-ui .action-card {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}
#whiteboard-content.whiteboard-ui .action-card:hover {
  transform: translateY(-2px);
  border-color: #cdd3dd;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
#whiteboard-content.whiteboard-ui .action-card:active {
  transform: translateY(0);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}
#whiteboard-content.whiteboard-ui .card-title {
  font-weight: 700;
  margin-bottom: 6px;
}
#whiteboard-content.whiteboard-ui .card-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}
#whiteboard-content.whiteboard-ui .student-box {
  position: relative;
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
#whiteboard-content.whiteboard-ui .student-box:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  border-color: #cbd5e0;
}
#whiteboard-content.whiteboard-ui .student-box .student-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
#whiteboard-content.whiteboard-ui .student-box .student-name {
  font-size: 15px;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
#whiteboard-content.whiteboard-ui .student-box .student-status {
  display: flex;
  align-items: center;
  gap: 6px;
}
#whiteboard-content.whiteboard-ui .label-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #4a5568;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.05);
}
#whiteboard-content.whiteboard-ui .status-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
#whiteboard-content.whiteboard-ui .stat {
  font-weight: 700;
}
#whiteboard-content.whiteboard-ui .facility-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
#whiteboard-content.whiteboard-ui .facility {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #eee;
  background: #fafafa;
  text-align: center;
}
#whiteboard-content.whiteboard-ui .facility .fac-label {
  font-weight: 700;
  margin-bottom: 6px;
}
#whiteboard-content.whiteboard-ui .next-panel {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}
#whiteboard-content.whiteboard-ui .wb-log {
  height: 80px;
  overflow: auto;
  border: 1px solid #eee;
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
}
`;

type WhiteboardView = "dashboard" | "relax";
let whiteboardView: WhiteboardView = "dashboard";
let relaxSelection: RelaxOptionId = 1;
let relaxStatusMessage: string | null = null;
const LOG_LIMIT = 30;
const whiteboardLogs: string[] = [];

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

function createHeader(gameState: GameState): HTMLElement {
  const header = (
    <header>
      <div>
        <h1>OI 教练模拟器</h1>
      </div>
      <div className="topline">
        <div className="small" id="header-week">第 {gameState.week} 周</div>
        <div className="small" id="header-province">省份: {gameState.provinceName || "-"}</div>
        <div className="small" id="header-budget">经费: {formatCurrency(gameState.budget)}</div>
        <div className="small" id="header-reputation">声誉: {gameState.reputation}</div>
        <div className="small" id="header-weather">
          天气: <span id="header-weather-text">{gameState.weather}</span> / 温度:{" "}
          <span id="header-temp-header">{gameState.temperature.toFixed(1)}°C</span>
        </div>
        <div className="small muted" id="header-next-competition">
          下场比赛: <span id="header-next-comp-small">暂无</span>
        </div>
      </div>
    </header>
  );
  return header as HTMLElement;
}

function createFacilitiesPanel(gameState: GameState): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "facility-grid";
  const entries: Array<[string, number, string]> = [
    ["计算机", gameState.facilities.computer, "提升综合训练效率"],
    ["资料库", gameState.facilities.library, "提升知识训练效率"],
    ["空调", gameState.facilities.ac, "提升舒适度"],
    ["宿舍", gameState.facilities.dorm, "提升舒适度"],
    ["食堂", gameState.facilities.canteen, "减少训练压力"],
    ["维护费/周", gameState.facilities.getMaintenanceCost(), "所有设施每周维护费用"]
  ];
  entries.forEach(([label, value, desc]) => {
    const fac = document.createElement("div");
    fac.className = "facility";
    fac.innerHTML = `
      <div class="fac-label">${label}</div>
      <div class="stat">${value}</div>
      <div class="small muted">${desc}</div>
    `;
    panel.appendChild(fac);
  });
  return panel;
}

function createLogPanel(): HTMLElement {
  const log = document.createElement("div");
  log.id = "log";
  log.className = "wb-log";
  renderLogs(log);
  return log;
}

function renderLogs(logPanel: HTMLElement): void {
  logPanel.replaceChildren();
  if (whiteboardLogs.length === 0) {
    logPanel.textContent = "点击右侧行动按钮以记录操作...";
    return;
  }
  whiteboardLogs.forEach((entry) => {
    const row = document.createElement("div");
    row.textContent = entry;
    logPanel.appendChild(row);
  });
}

function pushLog(message: string): void {
  whiteboardLogs.unshift(message);
  if (whiteboardLogs.length > LOG_LIMIT) whiteboardLogs.pop();
}

function createActionCards(gameState: GameState, appendLog: (msg: string) => void): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "action-cards";

  const cards: Array<[ActionType | "RESIGN", string, string]> = [
    ["TRAIN", ACTIONS.TRAIN, "安排学生进行专项训练，提高实力"],
    ["RELAX", ACTIONS.RELAX, "放松娱乐，缓解压力"],
    ["MOCK", ACTIONS.MOCK, "进行内部模拟比赛，检验训练成果"],
    ["CAMP", ACTIONS.CAMP, "参加合适的外出集训，集中提升训练效率"],
    ["RESIGN", "辞职", "立即结束本赛季并进行结算"]
  ];

  const handleAction = (action: ActionType | "RESIGN"): void => {
    const label = action === "RESIGN" ? "辞职" : ACTIONS[action];
    console.debug("[acg3d] whiteboard action click", { action, label, week: gameState.week, budget: gameState.budget });
    if (action === "RELAX") {
      whiteboardView = "relax";
      relaxStatusMessage = null;
      return;
    }
    appendLog(`第 ${gameState.week} 周：选择了 ${label}，当前经费 ${formatCurrency(gameState.budget)}`);
  };

  cards.forEach(([action, title, desc]) => {
    const card = document.createElement("div");
    card.className = "action-card";
    card.id = `action-${String(action).toLowerCase()}`;
    card.dataset.action = action;
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const cardTitle = document.createElement("div");
    cardTitle.className = "card-title";
    cardTitle.textContent = title;

    const cardDesc = document.createElement("div");
    cardDesc.className = "card-desc";
    cardDesc.textContent = desc;

    card.appendChild(cardTitle);
    card.appendChild(cardDesc);

    card.addEventListener("click", () => handleAction(action));
    wrapper.appendChild(card);
  });

  const eventContainer = document.createElement("div");
  eventContainer.id = "event-cards-container";
  wrapper.appendChild(eventContainer);

  return wrapper;
}

export function createWhiteboardUI(gameState: GameState): HTMLElement {
  const root = document.createElement("div");
  root.id = "whiteboard-content";
  root.className = "whiteboard-ui";

  const style = document.createElement("style");
  style.textContent = BASE_GAME_WHITEBOARD_CSS;
  root.appendChild(style);

  const header = createHeader(gameState);
  root.appendChild(header);

  if (whiteboardView === "relax") {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "center";
    row.style.alignItems = "center";
    row.style.paddingTop = "20px";
    row.style.paddingBottom = "20px";
    row.style.minHeight = "70vh";

    const onSelect = (id: RelaxOptionId): void => {
      relaxSelection = id;
    };
    const onCancel = (): void => {
      whiteboardView = "dashboard";
      relaxSelection = 1;
      relaxStatusMessage = null;
    };
    const onConfirm = (id: RelaxOptionId): void => {
      const actionWeek = gameState.week;
      const result = gameState.performRelax(id);
      if (!result.success) {
        relaxStatusMessage = result.error;
        return;
      }
      pushLog(`第 ${actionWeek} 周：娱乐-${result.option.label}，费用 ${formatCurrency(result.cost)}`);
      relaxStatusMessage = null;
      whiteboardView = "dashboard";
      relaxSelection = 1;
    };

    const modal = createRelaxModal({
      gameState,
      selectedId: relaxSelection,
      onSelect,
      onCancel,
      onConfirm,
      status: relaxStatusMessage
    });

    row.appendChild(modal);
    root.appendChild(row);
    return root;
  }

  const row = document.createElement("div");
  row.className = "row";

  const leftCol = document.createElement("div");
  leftCol.className = "col panel";
  leftCol.style.flex = "1 1 600px";

  const summaryHeader = document.createElement("div");
  summaryHeader.className = "flex-between";
  const title = document.createElement("h3");
  title.style.margin = "0";
  title.textContent = "教练面板";
  const comfort = document.createElement("div");
  comfort.className = "small";
  comfort.innerHTML = `舒适度: <span id="comfort-val">${Math.round(gameState.getComfort())}</span>`;
  summaryHeader.appendChild(title);
  summaryHeader.appendChild(comfort);
  leftCol.appendChild(summaryHeader);

  const facilitiesWrapper = document.createElement("div");
  facilitiesWrapper.style.marginTop = "16px";
  const facilitiesHeading = document.createElement("h4");
  facilitiesHeading.style.margin = "0 0 8px 0";
  facilitiesHeading.textContent = "设施状态";
  facilitiesWrapper.appendChild(facilitiesHeading);
  facilitiesWrapper.appendChild(createFacilitiesPanel(gameState));
  leftCol.appendChild(facilitiesWrapper);

  const nextPanelWrapper = document.createElement("div");
  nextPanelWrapper.style.marginTop = "16px";
  const nextHeading = document.createElement("h4");
  nextHeading.style.margin = "0 0 8px 0";
  nextHeading.textContent = "下场比赛";
  const nextPanel = document.createElement("div");
  nextPanel.id = "next-competition-panel";
  nextPanel.className = "next-panel";
  nextPanel.innerHTML = `
    <div id="next-comp" style="margin-bottom:8px">无</div>
    <div id="daily-quote" class="small muted">一句话加载中...</div>
  `;
  nextPanelWrapper.appendChild(nextHeading);
  nextPanelWrapper.appendChild(nextPanel);
  leftCol.appendChild(nextPanelWrapper);

  const speechWrapper = document.createElement("div");
  speechWrapper.style.marginTop = "16px";
  const speechHeading = document.createElement("h4");
  speechHeading.style.margin = "0 0 8px 0";
  speechHeading.textContent = "训话";
  const speechInput = document.createElement("input");
  speechInput.type = "text";
  speechInput.id = "coach-speech-input";
  speechInput.placeholder = "输入训话内容...";
  speechInput.style.width = "100%";
  speechInput.style.padding = "8px";
  speechInput.style.border = "1px solid #ddd";
  speechInput.style.borderRadius = "6px";
  speechInput.style.fontSize = "14px";
  speechInput.style.boxSizing = "border-box";
  speechWrapper.appendChild(speechHeading);
  speechWrapper.appendChild(speechInput);
  leftCol.appendChild(speechWrapper);

  const logWrapper = document.createElement("div");
  logWrapper.style.marginTop = "16px";
  const logHeading = document.createElement("h4");
  logHeading.style.margin = "0 0 8px 0";
  logHeading.textContent = "日志";
  const logPanel = createLogPanel();
  logWrapper.appendChild(logHeading);
  logWrapper.appendChild(logPanel);
  leftCol.appendChild(logWrapper);

  row.appendChild(leftCol);

  const rightCol = document.createElement("div");
  rightCol.className = "col panel side-panel";
  const actionHeading = document.createElement("h3");
  actionHeading.style.marginTop = "0";
  actionHeading.textContent = "本周行动（每个行动持续1周）";
  rightCol.appendChild(actionHeading);

  const appendLog = (msg: string): void => {
    pushLog(msg);
    renderLogs(logPanel);
  };

  rightCol.appendChild(createActionCards(gameState, appendLog));
  row.appendChild(rightCol);

  root.appendChild(row);

  const footerPanel = document.createElement("div");
  footerPanel.className = "panel";
  footerPanel.id = "footer-panel";
  footerPanel.style.display = "none";
  root.appendChild(footerPanel);

  return root;
}
