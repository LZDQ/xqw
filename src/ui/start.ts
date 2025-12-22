import { GameState } from "../core/GameState.ts";
import { setActiveGameState } from "../core/session.ts";
import { DIFFICULTIES, PROVINCES } from "../lib/config.ts";
import { PROVINCE_STRENGTH } from "../lib/enums.ts";

function clampStudents(value: number): number {
  if (Number.isNaN(value)) return 5;
  return Math.min(9, Math.max(3, Math.round(value)));
}

function renderDifficultyOptions(select: HTMLSelectElement): void {
  DIFFICULTIES.forEach((diff) => {
    const option = document.createElement("option");
    option.value = String(diff.id);
    option.textContent = `${diff.name}｜${diff.description}`;
    if (diff.id === 2) option.selected = true;
    select.appendChild(option);
  });
}

function renderProvinces(select: HTMLSelectElement): void {
  PROVINCES.forEach((province) => {
    const tag = PROVINCE_STRENGTH[province.type];
    const option = document.createElement("option");
    option.value = String(province.id);
    option.textContent = `${province.name}（${tag}）`;
    select.appendChild(option);
  });
}

export async function showStartHUD(parent: HTMLElement): Promise<GameState> {
  const overlay = document.createElement("div");
  overlay.id = "start-screen";
  overlay.innerHTML = `
    <div class="start-card">
      <h1>OI Trainer 3D</h1>
      <p class="lead">选择开局参数，进入 3D 教室继续原有玩法。</p>
      <form class="start-form">
        <label class="field">
          <span>难度</span>
          <select id="start-difficulty" name="difficulty"></select>
        </label>
        <label class="field">
          <span>所在省份</span>
          <select id="start-province" name="province"></select>
        </label>
        <label class="field">
          <span>初始学生人数</span>
          <input id="start-num-students" type="number" name="numStudents" min="3" max="9" value="5" />
          <small>范围 3 - 9 人，默认 5 人</small>
        </label>
        <button type="submit" class="start-button">进入教室</button>
      </form>
    </div>
  `;

  const difficultySelect = overlay.querySelector<HTMLSelectElement>("#start-difficulty");
  const provinceSelect = overlay.querySelector<HTMLSelectElement>("#start-province");
  const numStudentsInput = overlay.querySelector<HTMLInputElement>("#start-num-students");
  const form = overlay.querySelector<HTMLFormElement>("form");

  if (!difficultySelect || !provinceSelect || !numStudentsInput || !form) {
    throw new Error("Failed to initialize start screen elements");
  }

  renderDifficultyOptions(difficultySelect);
  renderProvinces(provinceSelect);

  numStudentsInput.addEventListener("blur", () => {
    numStudentsInput.value = String(clampStudents(Number(numStudentsInput.value)));
  });

  parent.appendChild(overlay);

  return await new Promise<GameState>((resolve) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const difficulty = Number.parseInt(difficultySelect.value, 10);
      const provinceId = Number.parseInt(provinceSelect.value, 10);
      const numStudents = clampStudents(Number.parseInt(numStudentsInput.value, 10));

      const gameState = new GameState(difficulty, provinceId, numStudents);
      setActiveGameState(gameState);

      overlay.classList.add("start-screen--hidden");
      window.setTimeout(() => overlay.remove(), 200);
      resolve(gameState);
    });
  });
}
