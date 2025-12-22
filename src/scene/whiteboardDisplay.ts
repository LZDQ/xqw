import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import type * as THREEType from "three";
import type { ActionType } from "../lib/enums.ts";

export interface WhiteboardActionRect {
  id: ActionType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WhiteboardMetrics {
  containerWidth: number;
  containerHeight: number;
  actions: WhiteboardActionRect[];
}

export interface WhiteboardDisplay {
  width: number;
  height: number;
  object: THREEType.Object3D;
  element: HTMLElement;
  ready: Promise<WhiteboardMetrics>;
}

export interface WhiteboardDisplayOptions {
  width: number;
  height: number;
  position: THREEType.Vector3;
  rotation?: THREEType.Euler;
  domWidth?: number;
  src?: string;
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

  const iframe = document.createElement("iframe");
  iframe.src = options.src ?? "/base-game/game.html?embedded=1";
  iframe.sandbox = "allow-same-origin";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";
  container.appendChild(iframe);

  const object = new CSS3DObject(container);
  object.name = "WhiteboardDOM";
  object.position.copy(options.position);
  if (options.rotation) {
    object.rotation.copy(options.rotation);
  }

  const scale = options.width / domWidth;
  object.scale.setScalar(scale);

  const ready = new Promise<WhiteboardMetrics>((resolve) => {
    const fallback = (): void => {
      resolve({
        containerWidth: domWidth,
        containerHeight: domHeight,
        actions: []
      });
    };

    const timer = window.setTimeout(fallback, 2000);

    iframe.addEventListener("load", () => {
      window.clearTimeout(timer);
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) {
        fallback();
        return;
      }
      const bodyRect = doc.body.getBoundingClientRect();
      const actions: WhiteboardActionRect[] = [];
      (Object.keys(ACTION_DOM_ID) as ActionType[]).forEach((id) => {
        const el = doc.getElementById(ACTION_DOM_ID[id]);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        actions.push({
          id,
          x: rect.left - bodyRect.left,
          y: rect.top - bodyRect.top,
          width: rect.width,
          height: rect.height
        });
      });
      resolve({
        containerWidth: bodyRect.width || domWidth,
        containerHeight: bodyRect.height || domHeight,
        actions
      });
    });
  });

  return {
    width: options.width,
    height: options.height,
    object,
    element: container,
    ready
  };
}
