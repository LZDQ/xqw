import type * as THREEType from "three";

export interface DebugHUDController {
  update: (animateCount: number) => void;
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
    <div class="debug-hud__row">
      <span class="debug-hud__label">Animate Count</span>
      <span class="debug-hud__value" data-animate-count></span>
    </div>
  `;

  const eyeValue = container.querySelector<HTMLElement>("[data-eye]");
  const targetValue = container.querySelector<HTMLElement>("[data-target]");
  const animateCountValue = container.querySelector<HTMLElement>("[data-animate-count]");
  if (!eyeValue || !targetValue || !animateCountValue) {
    throw new Error("Failed to initialize debug HUD");
  }

  let targetLabel = "-";

  const setTarget = (label: string): void => {
    targetLabel = label || "-";
  };

  const update = (animateCount: number): void => {
    const { x, y, z } = camera.position;
    eyeValue.textContent = `${fmt(x)}, ${fmt(y)}, ${fmt(z)}`;
    targetValue.textContent = targetLabel;
    animateCountValue.textContent = `${animateCount}`;
  };

  const dispose = (): void => {
    container.remove();
  };

  parent.appendChild(container);
  update(0);
  return { update, setTarget, dispose };
}

function fmt(v: number): string {
  return v.toFixed(2);
}
