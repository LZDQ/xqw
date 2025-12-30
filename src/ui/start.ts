import { GameState } from "../core/GameState.ts";
import { TALENTS } from "../core/Talents.ts";
import { setActiveGameState } from "../core/session.ts";
import { DIFFICULTIES, PROVINCES } from "../lib/config.ts";
import { PROVINCE_STRENGTH, type ProvinceStrength } from "../lib/enums.ts";

const MASK_STORAGE_KEY = "oi_start_mask_dismissed";

function clampStudents(value: number): number {
  if (Number.isNaN(value)) return 5;
  return Math.min(9, Math.max(3, Math.round(value)));
}

function getStrengthLabel(type: ProvinceStrength): string {
  return PROVINCE_STRENGTH[type] ?? "普通省";
}

function strengthAccent(type: ProvinceStrength): string {
  switch (type) {
    case "STRONG":
      return "#2563eb";
    case "WEAK":
      return "#f97316";
    default:
      return "#4b5563";
  }
}

function renderDifficultyGrid(hidden: HTMLInputElement, container: HTMLElement, note: HTMLElement | null): void {
  container.innerHTML = "";
  DIFFICULTIES.forEach((diff) => {
    const card = document.createElement("div");
    card.className = "option-card";
    card.dataset.val = String(diff.id);
    card.innerHTML = `
      <div class="option-title">${diff.name}</div>
      <div class="small muted">${diff.description}</div>
    `;
    if (String(diff.id) === hidden.value) {
      card.classList.add("selected");
      if (note) note.textContent = `${diff.name} — ${diff.description}`;
    }
    card.addEventListener("click", () => {
      container.querySelectorAll(".option-card.selected").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      hidden.value = String(diff.id);
      if (note) note.textContent = `${diff.name} — ${diff.description}`;
    });
    container.appendChild(card);
  });
}

function renderProvinceGrid(hidden: HTMLInputElement, container: HTMLElement): void {
  container.innerHTML = "";
  PROVINCES.forEach((province) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "prov-btn";
    btn.dataset.val = String(province.id);
    btn.innerHTML = `
      <span class="prov-name">${province.name}</span>
      <span class="prov-tag" style="background:${strengthAccent(province.type)}">${getStrengthLabel(province.type)}</span>
    `;
    if (hidden.value === btn.dataset.val) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      container.querySelectorAll(".prov-btn.selected").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      hidden.value = btn.dataset.val ?? hidden.value;
    });
    container.appendChild(btn);
  });
}

function renderTalentGrid(container: HTMLElement): void {
  container.innerHTML = "";
  TALENTS.filter((talent) => talent.name !== "__talent_cleanup__").forEach((talent) => {
    const card = document.createElement("div");
    card.className = "talent-card";
    card.innerHTML = `
      <div class="talent-head">
        <span class="color-dot" style="background:${talent.color}"></span>
        <span class="title">${talent.name}</span>
      </div>
      <div class="desc">${talent.description}</div>
    `;
    container.appendChild(card);
  });
}

function setupCollapsibles(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".sub-panel.collapsible").forEach((panel) => {
    const head = panel.querySelector<HTMLElement>(".collapsible-head");
    const toggle = (expand: boolean): void => {
      panel.classList.toggle("collapsed", !expand);
      panel.classList.toggle("expanded", expand);
    };
    toggle(!panel.classList.contains("collapsed"));
    head?.addEventListener("click", () => {
      const shouldExpand = panel.classList.contains("collapsed");
      toggle(shouldExpand);
    });
  });
}

function attachMaskHandlers(root: HTMLElement): void {
  const mask = root.querySelector<HTMLElement>("#oiStartMask");
  const skipBtn = root.querySelector<HTMLButtonElement>("#oiMaskSkipBtn");
  const startBtn = root.querySelector<HTMLButtonElement>("#oiMaskStartBtn");
  const hide = (): void => {
    if (!mask) return;
    mask.style.opacity = "0";
    window.setTimeout(() => mask.remove(), 240);
    try {
      sessionStorage.setItem(MASK_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("Failed to persist mask dismissal", e);
    }
  };
  if (mask) {
    const dismissed = (() => {
      try {
        return sessionStorage.getItem(MASK_STORAGE_KEY) === "true";
      } catch (_e) {
        return false;
      }
    })();
    if (dismissed) {
      mask.remove();
    }
  }
  skipBtn?.addEventListener("click", hide);
  startBtn?.addEventListener("click", hide);
}

export async function showStartHUD(parent: HTMLElement): Promise<GameState> {
  const overlay = document.createElement("div");
  overlay.id = "start-screen";
  overlay.innerHTML = `
    <div id="oiStartMask" class="oi-start-mask" role="dialog" aria-label="游戏开始">
      <div class="mask-content">
        <h2>OI 教练模拟器</h2>
        <h3 class="oi-start-subtitle">信息学教练 3D 教室</h3>
        <p class="mask-lead">
          高二 NOIP 被创飞，你醒来成为学校竞赛总教练。复制原版 HUD 玩法，先在白板上把训练计划排好吧。
        </p>
        <div class="mask-actions">
          <button id="oiMaskSkipBtn" class="btn btn-skip">进入游戏</button>
        </div>
      </div>
    </div>
    <div class="start-layout">
      <header class="start-header">
        <h1>OI 教练模拟器 — 开始</h1>
        <p class="small muted">沿用原版开始界面，参数会直接作用于 3D 场景内的白板逻辑。</p>
      </header>
      <form class="panel start-panel" id="start-form">
        <div class="start-grid">
          <div class="start-block">
            <label class="block">选择难度</label>
            <div class="small muted">更高难度意味着初始预算更少、学生基础能力更低。</div>
            <input id="start-diff" type="hidden" value="2" />
            <div id="start-diff-grid" class="diff-grid"></div>
            <div id="diff-note" class="small muted"></div>
          </div>
        </div>

        <label class="block" for="start-prov-grid">选择省份</label>
        <div class="small muted">不同省份影响初始经费和训练质量。强省资源丰富，弱省更具挑战。</div>
        <input id="start-province" type="hidden" value="${PROVINCES[0]?.id ?? 1}" />
        <div id="start-prov-grid" class="prov-grid"></div>

        <label class="block" for="start-stu">学生人数 (3-9)</label>
        <div class="small muted">更多学生意味着更多机会，同时也会消耗更多经费。</div>
        <input id="start-stu" class="start-input" type="number" min="3" max="9" value="5" />

        <div class="sub-panel collapsible collapsed" id="talent-only-panel">
          <h4 class="collapsible-head">天赋预览</h4>
          <div class="small muted">学生在训练或比赛中有概率获得天赋，影响表现与训练效果。</div>
          <div id="talent-grid" class="talent-grid"></div>
        </div>

        <div class="modal-actions start-actions">
          <button class="btn btn-ghost" id="start-help" type="button">查看详细帮助</button>
          <button class="btn btn-ghost" id="daily-challenge-btn" type="button" disabled title="每日挑战即将开放">📅 今日挑战</button>
          <button class="btn btn-primary" id="start-button" type="submit">开始游戏 🚀</button>
        </div>
      </form>
      <div class="disclaimer" role="note" aria-label="免责声明">
        免责声明：本游戏为虚构的教学模拟游戏。训练方式、成绩、资源与时间安排均为玩法设定。所有人名与比赛成绩均为虚构，与现实无关。
      </div>
    </div>
  `;

  const difficultyInput = overlay.querySelector<HTMLInputElement>("#start-diff");
  const diffGrid = overlay.querySelector<HTMLElement>("#start-diff-grid");
  const diffNote = overlay.querySelector<HTMLElement>("#diff-note");
  const provinceInput = overlay.querySelector<HTMLInputElement>("#start-province");
  const provinceGrid = overlay.querySelector<HTMLElement>("#start-prov-grid");
  const studentInput = overlay.querySelector<HTMLInputElement>("#start-stu");
  const talentGrid = overlay.querySelector<HTMLElement>("#talent-grid");
  const startBtn = overlay.querySelector<HTMLButtonElement>("#start-button");
  const helpBtn = overlay.querySelector<HTMLButtonElement>("#start-help");
  const form = overlay.querySelector<HTMLFormElement>("#start-form");

  if (
    !difficultyInput ||
    !diffGrid ||
    !provinceInput ||
    !provinceGrid ||
    !studentInput ||
    !startBtn ||
    !helpBtn ||
    !form ||
    !talentGrid
  ) {
    throw new Error("Failed to initialize start screen elements");
  }

  renderDifficultyGrid(difficultyInput, diffGrid, diffNote);
  renderProvinceGrid(provinceInput, provinceGrid);
  renderTalentGrid(talentGrid);
  setupCollapsibles(overlay);
  attachMaskHandlers(overlay);

  studentInput.addEventListener("blur", () => {
    studentInput.value = String(clampStudents(Number(studentInput.value)));
  });

  helpBtn.addEventListener("click", () => {
    window.open("/base-game/help.html", "_blank", "noopener");
  });

  let started = false;
  let cachedState: GameState | null = null;
  const startGame = (): GameState => {
    if (started && cachedState) return cachedState;
    started = true;
    const difficulty = Number.parseInt(difficultyInput.value, 10) || 2;
    const provinceId = Number.parseInt(provinceInput.value, 10) || (PROVINCES[0]?.id ?? 1);
    const numStudents = clampStudents(Number.parseInt(studentInput.value, 10));
    const gameState = new GameState(difficulty, provinceId, numStudents);
    cachedState = gameState;
    setActiveGameState(gameState);
    overlay.classList.add("start-screen--hidden");
    window.setTimeout(() => overlay.remove(), 220);
    return gameState;
  };

  const waitForStart = new Promise<GameState>((resolve) => {
    startBtn.addEventListener("click", () => resolve(startGame()));
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      resolve(startGame());
    });
  });

  parent.appendChild(overlay);
  return await waitForStart;
}
