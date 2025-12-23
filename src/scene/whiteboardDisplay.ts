import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import type * as THREEType from "three";
import type { ActionType } from "../lib/enums.ts";
import { SEASON_WEEKS } from "../lib/constants.ts";
import type { GameState } from "../core/GameState.ts";
import { createBoardDom } from "../ui/whiteboard/BoardDom.tsx";

export interface WhiteboardActionRect {
  id: ActionType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WhiteboardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WhiteboardMetrics {
  containerWidth: number;
  containerHeight: number;
  actions: WhiteboardActionRect[];
  weeklyRect?: WhiteboardRect;
  actionRect?: WhiteboardRect;
}

export interface WhiteboardDisplay {
  width: number;
  height: number;
  object: THREEType.Object3D;
  element: HTMLElement;
  showAction: (action: ActionType) => void;
  showWeekly: () => void;
  syncGameState: (state: GameState) => void;
  ready: Promise<WhiteboardMetrics>;
}

export interface WhiteboardDisplayOptions {
  width: number;
  height: number;
  position: THREEType.Vector3;
  rotation?: THREEType.Euler;
  domWidth?: number;
}

const ACTION_DOM_ID: Record<ActionType, string> = {
  TRAIN: "action-train",
  RELAX: "action-entertain",
  MOCK: "action-mock",
  CAMP: "action-outing"
};

export function createWhiteboardDisplay(
  _THREE: typeof THREEType,
  options: WhiteboardDisplayOptions
): WhiteboardDisplay {
  const domWidth = options.domWidth ?? 1400;
  const domHeight = Math.round(domWidth * (options.height / options.width));

  const container = document.createElement("div");
  container.className = "whiteboard-dom";
  container.style.width = `${domWidth}px`;
  container.style.height = `${domHeight}px`;
  container.style.overflow = "hidden";
  container.style.borderRadius = "12px";
  container.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
  container.style.background = "#111";

  const board = createBoardDom();
  const boardEl = board as HTMLElement & {
    __showActionCard?: (id: string) => void;
    __showWeeklyView?: () => void;
  };
  board.style.width = "100%";
  board.style.height = "100%";
  board.style.overflow = "hidden";
  board.style.pointerEvents = "none";
  container.appendChild(board);

  const object = new CSS3DObject(container);
  object.name = "WhiteboardDOM";
  object.position.copy(options.position);
  if (options.rotation) {
    object.rotation.copy(options.rotation);
  }

  const scale = options.width / domWidth;
  object.scale.setScalar(scale);

  const ready = new Promise<WhiteboardMetrics>((resolve) => {
    // Measure layout using an offscreen clone so we don't block rendering on the CSS3D attachment.
    const measureHost = document.createElement("div");
    measureHost.style.position = "absolute";
    measureHost.style.left = "-99999px";
    measureHost.style.top = "-99999px";
    measureHost.style.width = `${domWidth}px`;
    measureHost.style.height = `${domHeight}px`;
    const clone = board.cloneNode(true) as HTMLElement;
    measureHost.appendChild(clone);
    document.body.appendChild(measureHost);

    requestAnimationFrame(() => {
      const bodyRect = clone.getBoundingClientRect();
      const normalizeRect = (rect: DOMRect): WhiteboardRect => ({
        x: rect.left - bodyRect.left,
        y: rect.top - bodyRect.top,
        width: rect.width,
        height: rect.height
      });

      const actions: WhiteboardActionRect[] = [];
      (Object.keys(ACTION_DOM_ID) as ActionType[]).forEach((id) => {
        const el = clone.querySelector<HTMLElement>(`#${ACTION_DOM_ID[id]}`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const normalized = normalizeRect(rect);
        actions.push({ id, ...normalized });
      });

      const weeklyRect = clone.querySelector<HTMLElement>("#weekly-view")?.getBoundingClientRect();
      const actionView = clone.querySelector<HTMLElement>("#action-view");
      actionView?.classList.remove("hidden");
      const actionRect = actionView?.getBoundingClientRect();

      measureHost.remove();
      resolve({
        containerWidth: bodyRect.width || domWidth,
        containerHeight: bodyRect.height || domHeight,
        actions,
        weeklyRect: weeklyRect ? normalizeRect(weeklyRect) : undefined,
        actionRect: actionRect ? normalizeRect(actionRect) : undefined
      });
    });
  });

  function syncGameState(state: GameState): void {
    const setText = (id: string, text: string): void => {
      const el = board.querySelector<HTMLElement>(`#${id}`);
      if (el) el.textContent = text;
    };

    setText("header-week", `${state.week}`);
    setText("header-province", state.provinceName || "-");
    setText("header-budget", `¥${state.budget.toLocaleString("zh-CN")}`);
    setText("header-reputation", `${state.reputation}`);
    setText("header-weather-text", state.weather);
    setText("header-temp-header", `${state.temperature}°C`);

    setText("week-current", `${state.week}`);
    setText("week-total", `${SEASON_WEEKS}`);
    setText("week-weather", state.weather);
    setText("week-temp", `${state.temperature}°C`);
    setText("forecast-expense", `${(state.getWeeklyCost() * 4).toLocaleString("zh-CN")}`);

    const facility = board.querySelector<HTMLElement>("#facility-status");
    if (facility) {
      facility.innerHTML = `
        电脑 Lv.${state.facilities.computer} · 资料库 Lv.${state.facilities.library}<br />
        空调 Lv.${state.facilities.ac} · 宿舍 Lv.${state.facilities.dorm}<br />
        食堂 Lv.${state.facilities.canteen} · 维护费 ¥${state.facilities.getMaintenanceCost()}
      `;
    }
  }

  return {
    width: options.width,
    height: options.height,
    object,
    element: container,
    showAction: (action: ActionType) => {
      const cardId = ACTION_DOM_ID[action];
      boardEl.__showActionCard?.(cardId);
    },
    showWeekly: () => {
      boardEl.__showWeeklyView?.();
    },
    syncGameState,
    ready
  };
}
