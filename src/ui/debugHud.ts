import type * as THREEType from "three";

export interface DebugHUDController {
  update: () => void;
  setTarget: (label: string) => void;
  dispose: () => void;
}

export function initDebugHUD(parent: HTMLElement, camera: THREEType.Camera): DebugHUDController {
  const existing = document.getElementById("debug-hud");
  if (existing) {
    existing.remove();
  }

  const container = document.createElement("div");
  container.id = "debug-hud";
  container.innerHTML = `
    <div class="debug-hud__title">Debug</div>
    <div class="debug-hud__row">
      <span class="debug-hud__label">Eye</span>
      <span class="debug-hud__value" data-eye></span>
    </div>
    <div class="debug-hud__row">
      <span class="debug-hud__label">Target</span>
      <span class="debug-hud__value" data-target></span>
    </div>
  `;

  const eyeValue = container.querySelector<HTMLElement>("[data-eye]");
  const targetValue = container.querySelector<HTMLElement>("[data-target]");
  if (!eyeValue || !targetValue) {
    throw new Error("Failed to initialize debug HUD");
  }

  let targetLabel = "-";

  const setTarget = (label: string): void => {
    targetLabel = label || "-";
  };

  const update = (): void => {
    const { x, y, z } = camera.position;
    eyeValue.textContent = `${fmt(x)}, ${fmt(y)}, ${fmt(z)}`;
    targetValue.textContent = targetLabel;
  };

  const dispose = (): void => {
    container.remove();
  };

  parent.appendChild(container);
  update();
  return { update, setTarget, dispose };
}

function fmt(v: number): string {
  return v.toFixed(2);
}
