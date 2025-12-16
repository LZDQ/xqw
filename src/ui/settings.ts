import { InputController } from "../controls/input.ts";

const STORAGE_KEY = "acg3d_sensitivity";
let open = false;

export function initSettingsHUD(parent: HTMLElement, input: InputController): void {
  const existing = document.getElementById("settings-hud");
  if (existing) return;

  const container = document.createElement("div");
  container.id = "settings-hud";
  container.innerHTML = `
    <button class="settings-toggle" type="button">Settings</button>
    <div class="settings-modal hidden">
      <div class="settings-card">
        <div class="settings-card__header">
          <h3>Settings</h3>
          <button class="settings-close" type="button" aria-label="Close settings">×</button>
        </div>
        <label class="settings-field">
          <span>Mouse sensitivity</span>
          <input type="range" min="0.2" max="5" step="0.05" value="1" />
          <div class="settings-value"></div>
        </label>
      </div>
    </div>
  `;

  const toggle = container.querySelector<HTMLButtonElement>(".settings-toggle");
  const modal = container.querySelector<HTMLDivElement>(".settings-modal");
  const closeBtn = container.querySelector<HTMLButtonElement>(".settings-close");
  const slider = container.querySelector<HTMLInputElement>("input[type=range]");
  const valueLabel = container.querySelector<HTMLDivElement>(".settings-value");

  if (!toggle || !modal || !closeBtn || !slider || !valueLabel) {
    throw new Error("Failed to initialize settings HUD");
  }

  const saved = loadSensitivity();
  input.setSensitivity(saved);
  slider.value = String(saved);
  updateValue(saved, valueLabel);

  toggle.addEventListener("click", () => {
    modal.classList.remove("hidden");
    open = true;
    input.unlock();
  });

  const closeModal = (): void => {
    modal.classList.add("hidden");
    open = false;
  };

  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) {
      closeModal();
    }
  });

  slider.addEventListener("input", () => {
    const raw = Number.parseFloat(slider.value);
    input.setSensitivity(raw);
    saveSensitivity(input.getSensitivity());
    updateValue(input.getSensitivity(), valueLabel);
  });

  parent.appendChild(container);
}

function updateValue(value: number, label: HTMLElement): void {
  label.textContent = `${value.toFixed(2)}x`;
}

function loadSensitivity(): number {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const num = raw ? Number.parseFloat(raw) : NaN;
  if (Number.isFinite(num)) {
    return clamp(num, 0.2, 5);
  }
  return 1.0;
}

function saveSensitivity(value: number): void {
  window.localStorage.setItem(STORAGE_KEY, String(clamp(value, 0.2, 5)));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function isSettingsOpen(): boolean {
  return open;
}
