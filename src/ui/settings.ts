import type * as THREE from "three";
import { InputController } from "../controls/input.ts";

const SENS_STORAGE_KEY = "acg3d_sensitivity";
const FOV_STORAGE_KEY = "acg3d_fov";
let open = false;

export function initSettingsHUD(
  parent: HTMLElement,
  input: InputController,
  camera: THREE.PerspectiveCamera,
  onExit?: () => void
): void {
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
        <div class="settings-card__body">
          <p class="settings-subtitle">Tweak camera and control preferences.</p>
          <label class="settings-field">
            <div class="settings-field__row">
              <span>Mouse sensitivity</span>
              <span class="settings-value" data-setting="sensitivity"></span>
            </div>
            <input data-input="sensitivity" type="range" min="0.2" max="5" step="0.05" value="1" />
          </label>
          <label class="settings-field">
            <div class="settings-field__row">
              <span>Field of view</span>
              <span class="settings-value" data-setting="fov"></span>
            </div>
            <input data-input="fov" type="range" min="30" max="100" step="1" value="30" />
          </label>
          <div class="settings-actions">
            <button class="settings-exit" type="button">Exit game (resign)</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const toggle = container.querySelector<HTMLButtonElement>(".settings-toggle");
  const modal = container.querySelector<HTMLDivElement>(".settings-modal");
  const closeBtn = container.querySelector<HTMLButtonElement>(".settings-close");
  const sensSlider = container.querySelector<HTMLInputElement>('input[data-input="sensitivity"]');
  const fovSlider = container.querySelector<HTMLInputElement>('input[data-input="fov"]');
  const sensValueLabel = container.querySelector<HTMLSpanElement>('span[data-setting="sensitivity"]');
  const fovValueLabel = container.querySelector<HTMLSpanElement>('span[data-setting="fov"]');
  const exitBtn = container.querySelector<HTMLButtonElement>(".settings-exit");

  if (!toggle || !modal || !closeBtn || !sensSlider || !fovSlider || !sensValueLabel || !fovValueLabel || !exitBtn) {
    throw new Error("Failed to initialize settings HUD");
  }

  const savedSensitivity = loadSensitivity();
  const savedFov = loadFov(camera.fov);

  input.setSensitivity(savedSensitivity);
  camera.fov = savedFov;
  camera.updateProjectionMatrix();

  sensSlider.value = String(savedSensitivity);
  fovSlider.value = String(savedFov);
  updateSensitivityValue(savedSensitivity, sensValueLabel);
  updateFovValue(savedFov, fovValueLabel);

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

  sensSlider.addEventListener("input", () => {
    const raw = Number.parseFloat(sensSlider.value);
    input.setSensitivity(raw);
    saveSensitivity(input.getSensitivity());
    updateSensitivityValue(input.getSensitivity(), sensValueLabel);
  });

  fovSlider.addEventListener("input", () => {
    const raw = Number.parseFloat(fovSlider.value);
    applyFov(camera, raw);
    updateFovValue(camera.fov, fovValueLabel);
  });

  exitBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Resign and exit the current season?");
    if (!confirmed) return;
    closeModal();
    if (onExit) {
      onExit();
    } else {
      window.location.reload();
    }
  });

  parent.appendChild(container);
}

function updateSensitivityValue(value: number, label: HTMLElement): void {
  label.textContent = `${value.toFixed(2)}x`;
}

function loadSensitivity(): number {
  const raw = window.localStorage.getItem(SENS_STORAGE_KEY);
  const num = raw ? Number.parseFloat(raw) : NaN;
  if (Number.isFinite(num)) {
    return clamp(num, 0.2, 5);
  }
  return 1.0;
}

function saveSensitivity(value: number): void {
  window.localStorage.setItem(SENS_STORAGE_KEY, String(clamp(value, 0.2, 5)));
}

function updateFovValue(value: number, label: HTMLElement): void {
  label.textContent = `${Math.round(value)}°`;
}

function loadFov(defaultFov: number): number {
  const raw = window.localStorage.getItem(FOV_STORAGE_KEY);
  const num = raw ? Number.parseFloat(raw) : NaN;
  if (Number.isFinite(num)) {
    return clamp(num, 30, 100);
  }
  return clamp(defaultFov, 30, 100);
}

function saveFov(value: number): void {
  window.localStorage.setItem(FOV_STORAGE_KEY, String(clamp(value, 30, 100)));
}

function applyFov(camera: THREE.PerspectiveCamera, value: number): void {
  const clamped = clamp(value, 30, 100);
  camera.fov = clamped;
  camera.updateProjectionMatrix();
  saveFov(clamped);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function isSettingsOpen(): boolean {
  return open;
}
