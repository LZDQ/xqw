import type { CampDifficulty, GameState, RelaxOptionId } from "../core/GameState.ts";
import { ACTIONS, COMPETITION_NAME, type ActionType, type CompetitionName } from "../lib/enums.ts";
import { COMPETITION_SCHEDULE } from "../lib/constants.ts";
import { Contest, type ContestConfig } from "../core/Contest.ts";
import { createContestModal } from "./modals/contest.tsx";
import { createRelaxModal } from "./modals/relax.tsx";
import { createTrainModal } from "./modals/train.tsx";
import { createMockModal } from "./modals/mock.tsx";
import { createCampModal } from "./modals/camp.tsx";

const BASE_GAME_WHITEBOARD_CSS = `
#whiteboard-content.whiteboard-ui {
  font-family: "PingFang SC", "Microsoft YaHei", Arial, Helvetica, sans-serif;
  color: #222;
  background: #f7f7f8;
  padding: 18px;
  margin: 0;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  height: 180px;
  max-height: 240px;
  overflow: auto;
  border: 1px solid #eee;
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
}
`;

export type WhiteboardView = "dashboard" | "relax" | "train" | "contest" | "mock" | "camp";
let whiteboardView: WhiteboardView = "dashboard";
let relaxSelection: RelaxOptionId = 1;
let relaxStatusMessage: string | null = null;
let trainSelection: string | null = null;
let trainIntensity = 2;
let trainStatusMessage: string | null = null;
let mockOnlineIndex = 0;
let mockStatusMessage: string | null = null;
let campDifficulty: CampDifficulty = 1;
let campProvinceId = 1;
let campSelectedStudents: Set<string> = new Set();
let campSelectedTalents: Set<string> = new Set();
let campStatusMessage: string | null = null;
let campStep: 1 | 2 = 1;
let mockSnapshots: Map<string, { thinking: number; coding: number; knowledge: Record<string, number> }> | null = null;
const LOG_LIMIT = 30;
const whiteboardLogs: string[] = [];
let activeContest: Contest | null = null;
let activeContestLabel = "";
let pendingContestFinish: (() => void) | null = null;
let needsRender = false;

export function requestRender(): void {
  needsRender = true;
}

export function consumeRenderRequest(): boolean {
  const shouldRender = needsRender;
  needsRender = false;
  return shouldRender;
}

export function getWhiteboardView(): WhiteboardView {
  return whiteboardView;
}

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

function getNextOfficialContest(currentWeek: number): { name: CompetitionName; week: number } | null {
  const upcoming = COMPETITION_SCHEDULE.filter((c) => !c.nationalTeam && c.week >= currentWeek)
    .sort((a, b) => a.week - b.week);
  if (upcoming.length === 0) return null;
  return { name: upcoming[0].name, week: upcoming[0].week };
}

function formatContestLabel(name: CompetitionName): string {
  // console.debug('format contest label', name, COMPETITION_NAME[name]);
  return COMPETITION_NAME[name] ?? name;
}

function buildContestConfig(contestWeek: number): ContestConfig | null {
  const def = COMPETITION_SCHEDULE.find((c) => !c.nationalTeam && c.week === contestWeek);
  if (!def) return null;
  const perScore = Math.max(10, Math.floor(def.maxScore / Math.max(1, def.numProblems)));
  const problems = Array.from({ length: def.numProblems }, (_, idx) => {
    const subtasks = [{ score: perScore, difficulty: def.difficulty }];
    return {
      id: idx,
      tags: ["数据结构"],
      difficulty: def.difficulty,
      maxScore: perScore,
      subtasks
    };
  });
  return {
    name: def.name,
    duration: 240,
    problems,
    isMock: false
  };
}

function createActionCards(gameState: GameState, appendLog: (msg: string) => void): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "action-cards";

  const contestToday = COMPETITION_SCHEDULE.find(
    (c) => !c.nationalTeam && c.week === gameState.week
  );

  if (contestToday) {
    const contestConfig = buildContestConfig(contestToday.week);
    const startContest = (): void => {
      if (!contestConfig) {
        appendLog(`第 ${gameState.week} 周：未找到比赛配置`);
        return;
      }
      const eligible = gameState.getEligibleContestants(contestToday.name);
      if (eligible.length === 0) {
        appendLog(`第 ${gameState.week} 周：${formatContestLabel(contestToday.name)} 无参赛学生，自动跳过`);
        if (gameState.getSeasonIndexForWeek() === 1) {
          const alive = gameState.students.filter((s) => s && s.active !== false).length;
          if (alive === 0) {
            gameState.gameEnded = true;
            gameState.gameEndReason = "无学生可参赛，第二年结束";
            gameState.seasonEndTriggered = true;
          }
        }
        gameState.advanceWeeks(1);
        whiteboardView = "dashboard";
        requestRender();
        return;
      }
      activeContest = new Contest(contestConfig, eligible);
      activeContestLabel = formatContestLabel(contestConfig.name as CompetitionName);
      pendingContestFinish = () => {
        activeContest?.updateGameState(gameState);
        const finishedWeek = gameState.week;
        pushLog(`第 ${finishedWeek} 周：完成 ${activeContestLabel}`);
        gameState.advanceWeeks(1);
        activeContest = null;
        mockSnapshots = null;
        whiteboardView = "dashboard";
        pendingContestFinish = null;
      };
      whiteboardView = "contest";
    };

    const card = document.createElement("div");
    card.className = "action-card";
    card.id = "action-compete";
    card.dataset.action = "COMPETE";
    card.style.border = "2px solid rgba(59,130,246,0.35)";
    card.style.margin = "6px";

    const cardTitle = document.createElement("div");
    cardTitle.className = "card-title";
    cardTitle.textContent = `参加 ${formatContestLabel(contestToday.name)}`;

    const cardDesc = document.createElement("div");
    cardDesc.className = "card-desc";
    cardDesc.textContent = "正式比赛周，只能选择参赛";

    card.appendChild(cardTitle);
    card.appendChild(cardDesc);
    card.addEventListener("click", startContest);
    wrapper.appendChild(card);

    const eventContainer = document.createElement("div");
    eventContainer.id = "event-cards-container";
    wrapper.appendChild(eventContainer);
    return wrapper;
  }

  const cards: Array<[ActionType, string, string]> = [
    ["TRAIN", ACTIONS.TRAIN, "安排学生进行专项训练，提高实力"],
    ["RELAX", ACTIONS.RELAX, "放松娱乐，缓解压力"],
    ["MOCK", ACTIONS.MOCK, "进行内部模拟比赛，检验训练成果"],
    ["CAMP", ACTIONS.CAMP, "参加合适的外出集训，集中提升训练效率"]
  ];

  const handleAction = (action: ActionType): void => {
    const label = ACTIONS[action];
    console.debug("[acg3d] whiteboard action click", { action, label, week: gameState.week, budget: gameState.budget });
    if (action === "TRAIN") {
      whiteboardView = "train";
      trainStatusMessage = null;
      const tasks = gameState.weeklyTrainingTasks.length ? gameState.weeklyTrainingTasks : gameState.getTrainingTasks(6);
      trainSelection = tasks[0]?.id ?? null;
      return;
    }
    if (action === "RELAX") {
      whiteboardView = "relax";
      relaxStatusMessage = null;
      return;
    }
    if (action === "MOCK") {
      whiteboardView = "mock";
      mockStatusMessage = null;
      mockSnapshots = null;
      return;
    }
    if (action === "CAMP") {
      whiteboardView = "camp";
      campStatusMessage = null;
      campStep = 1;
      if (campProvinceId <= 0) campProvinceId = gameState.provinceId || 1;
      if (campSelectedStudents.size === 0) {
        gameState.students
          .filter((s) => s && s.active !== false)
          .forEach((s) => campSelectedStudents.add(s.name));
      }
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
  if (!gameState.logMessage) {
    gameState.logMessage = (msg: string): void => {
      pushLog(msg);
      requestRender();
    };
  }
  const root = document.createElement("div");
  root.id = "whiteboard-content";
  root.className = "whiteboard-ui";

  const style = document.createElement("style");
  style.textContent = BASE_GAME_WHITEBOARD_CSS;
  root.appendChild(style);

  const header = createHeader(gameState);
  root.appendChild(header);

  if (whiteboardView === "train") {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "center";
    row.style.alignItems = "center";
    row.style.paddingTop = "16px";
    row.style.paddingBottom = "16px";
    row.style.minHeight = "70vh";

    const tasks =
      gameState.weeklyTrainingTasks.length > 0
        ? gameState.weeklyTrainingTasks
        : gameState.getTrainingTasks(6);
    const selectedId = trainSelection ?? tasks[0]?.id ?? "";

    const onSelect = (taskId: string): void => {
      trainSelection = taskId;
      requestRender();
    };
    const onCancel = (): void => {
      whiteboardView = "dashboard";
      trainStatusMessage = null;
    };
    const onConfirm = (taskId: string, intensity: number): void => {
      const actionWeek = gameState.week;
      const result = gameState.performTraining(taskId, intensity);
      if (!result.success) {
        trainStatusMessage = result.error;
        requestRender();
        return;
      }
      pushLog(`第 ${actionWeek} 周：训练-${result.task.name}，强度 ${intensity}`);
      result.results.forEach((r) => {
        const boostStr = r.boosts.map((b) => `${b.type}+${b.actualAmount}`).join(", ");
        pushLog(
          `  ${r.name}: 效率${Math.round(r.multiplier * 100)}% [${boostStr}] 思维+${r.thinkingGain.toFixed(
            1
          )} 代码+${r.codingGain.toFixed(1)}`
        );
      });
      trainStatusMessage = null;
      whiteboardView = "dashboard";
      trainSelection = null;
      trainIntensity = 2;
    };

    const modal = createTrainModal({
      gameState,
      tasks,
      selectedTaskId: selectedId,
      intensity: trainIntensity,
      onSelect,
      onCancel,
      onIntensityChange: (val) => {
        trainIntensity = val;
      },
      onConfirm,
      status: trainStatusMessage
    });

    row.appendChild(modal);
    root.appendChild(row);
    return root;
  }

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
      requestRender();
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
        requestRender();
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

  if (whiteboardView === "mock") {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "center";
    row.style.alignItems = "center";
    row.style.paddingTop = "20px";
    row.style.paddingBottom = "20px";
    row.style.minHeight = "70vh";

    const modal = createMockModal({
      onlineIndex: mockOnlineIndex,
      onSelectOnline: (idx) => {
        mockOnlineIndex = idx;
        mockStatusMessage = null;
        requestRender();
      },
      onConfirm: (setup) => {
        const start = gameState.startMockContest(setup);
        if (!start.success) {
          mockStatusMessage = start.error;
          requestRender();
          return;
        }
        const eligible = start.participants;
        if (eligible.length === 0) {
          mockStatusMessage = "没有可参赛的学生";
          requestRender();
          return;
        }
        activeContest = new Contest(start.config, eligible);
        activeContestLabel = start.label;
        mockSnapshots = start.snapshots as Map<string, { thinking: number; coding: number; knowledge: Record<string, number> }>;
        pendingContestFinish = () => {
          activeContest?.updateGameState(gameState);
          const finishedWeek = gameState.week;
          const gains: string[] = [];
          if (mockSnapshots) {
            const afterMap = new Map(
              eligible.map((s) => [
                s.name,
                {
                  thinking: s.thinking,
                  coding: s.coding,
                  knowledge: { ...s.knowledge }
                }
              ])
            );
            afterMap.forEach((after, name) => {
              const before = mockSnapshots?.get(name);
              if (!before) return;
              const kLabels: string[] = [];
              (Object.keys(after.knowledge) as Array<keyof typeof after.knowledge>).forEach((k) => {
                const delta = after.knowledge[k] - (before.knowledge[k] ?? 0);
                if (Math.abs(delta) > 1e-6) kLabels.push(`${k}+${delta.toFixed(1)}`);
              });
              const dThink = after.thinking - before.thinking;
              const dCode = after.coding - before.coding;
              gains.push(`${name}: 思维+${dThink.toFixed(1)} 代码+${dCode.toFixed(1)} ${kLabels.join(" ")}`);
            });
          }
          pushLog(`第 ${finishedWeek} 周：模拟赛-${start.label}，费用 ${formatCurrency(start.cost)}`);
          gains.forEach((g) => pushLog(`  ${g}`));
          gameState.weeksSinceEntertainment += 1;
          gameState.advanceWeeks(1);
          activeContest = null;
          mockSnapshots = null;
          whiteboardView = "dashboard";
          pendingContestFinish = null;
        };
        whiteboardView = "contest";
        requestRender();
      },
      onCancel: () => {
        whiteboardView = "dashboard";
        mockStatusMessage = null;
        requestRender();
      },
      status: mockStatusMessage
    });

    row.appendChild(modal);
    root.appendChild(row);
    return root;
  }

  if (whiteboardView === "camp") {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "center";
    row.style.alignItems = "center";
    row.style.paddingTop = "20px";
    row.style.paddingBottom = "20px";
    row.style.minHeight = "70vh";

    const participants = Array.from(campSelectedStudents);
    const costPreview = gameState.computeCampCost(
      campDifficulty,
      campProvinceId || gameState.provinceId,
      participants.length,
      campSelectedTalents.size
    );

    const modal = createCampModal({
      gameState,
      difficulty: campDifficulty,
      provinceId: campProvinceId || gameState.provinceId,
      selectedStudents: campSelectedStudents,
      selectedTalents: campSelectedTalents,
      stage: campStep,
      costPreview,
      onSelectDifficulty: (diff) => {
        campDifficulty = diff;
        campStatusMessage = null;
        requestRender();
      },
      onSelectProvince: (id) => {
        campProvinceId = id;
        campStatusMessage = null;
        requestRender();
      },
      onToggleStudent: (name) => {
        if (campSelectedStudents.has(name)) campSelectedStudents.delete(name);
        else campSelectedStudents.add(name);
        requestRender();
      },
      onToggleTalent: (name) => {
        if (campSelectedTalents.has(name)) campSelectedTalents.delete(name);
        else campSelectedTalents.add(name);
        requestRender();
      },
      onNextStage: () => {
        campStep = 2;
        requestRender();
      },
      onPrevStage: () => {
        campStep = 1;
        requestRender();
      },
      onConfirm: () => {
        const actionWeek = gameState.week;
        const result = gameState.performCamp({
          difficulty: campDifficulty,
          provinceId: campProvinceId || gameState.provinceId,
          studentNames: Array.from(campSelectedStudents),
          inspireTalents: Array.from(campSelectedTalents)
        });
        if (!result.success) {
          campStatusMessage = result.error;
          requestRender();
          return;
        }
        pushLog(
          `第 ${actionWeek} 周：外出集训-${result.provinceName} 难度${result.difficulty}，费用 ${formatCurrency(
            result.cost
          )}`
        );
        result.gains?.forEach((g) => {
          const kn = Object.entries(g.knowledge)
            .map(([k, v]) => `${k}+${v.toFixed(1)}`)
            .join(" ");
          pushLog(`  ${g.name}: 思维+${g.thinking.toFixed(1)} 代码+${g.coding.toFixed(1)} ${kn}`);
        });
        result.talentGains
          ?.filter((tg) => tg.talents.length > 0)
          .forEach((tg) => {
            const talents = tg.talents.join("、");
            pushLog(`  ${tg.name}: 获得天赋 ${talents}`);
          });
        campStatusMessage = null;
        whiteboardView = "dashboard";
        campStep = 1;
        requestRender();
      },
      onCancel: () => {
        whiteboardView = "dashboard";
        campStatusMessage = null;
        campStep = 1;
        requestRender();
      },
      status: campStatusMessage
    });

    row.appendChild(modal);
    root.appendChild(row);
    return root;
  }

  if (whiteboardView === "contest") {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "center";
    row.style.alignItems = "center";
    row.style.paddingTop = "20px";
    row.style.paddingBottom = "20px";
    row.style.minHeight = "70vh";

    if (!activeContest) {
      const fallback = document.createElement("div");
      fallback.className = "panel";
      fallback.textContent = "未找到比赛实例，请返回重新进入。";
      row.appendChild(fallback);
      root.appendChild(row);
      return root;
    }

    const maxScore = activeContest.config.problems.reduce((sum, p) => sum + p.maxScore, 0);
    const cutoffInfo = gameState.getContestCutoff(activeContest.config.name as CompetitionName, maxScore);
    const modal = createContestModal(activeContest, {
      onFinish: () => {
        if (pendingContestFinish) pendingContestFinish();
        requestRender();
      },
      onClose: () => {
        activeContest = null;
        whiteboardView = "dashboard";
        pendingContestFinish = null;
        requestRender();
      },
      tickMs: 500,
      cutoffScore: cutoffInfo.score,
      cutoffRatio: cutoffInfo.ratio
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
  const upcomingContest = getNextOfficialContest(gameState.week);
  const nextText = upcomingContest
    ? (() => {
        const weeksLeft = Math.max(0, upcomingContest.week - gameState.week);
        return weeksLeft === 0
          ? `${formatContestLabel(upcomingContest.name)}（本周）`
          : `${formatContestLabel(upcomingContest.name)}（${weeksLeft} 周后）`;
      })()
    : "无";
  nextPanel.innerHTML = `
    <div id="next-comp" style="margin-bottom:8px">${nextText}</div>
    <div id="daily-quote" class="small muted">一句话加载中...</div>
  `;
  nextPanelWrapper.appendChild(nextHeading);
  nextPanelWrapper.appendChild(nextPanel);
  leftCol.appendChild(nextPanelWrapper);

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
