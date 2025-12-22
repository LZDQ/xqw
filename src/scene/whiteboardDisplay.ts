import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import type * as THREEType from "three";
import type { ActionType } from "../lib/enums.ts";
import { createBoardDom } from "../ui/whiteboard/BoardDom.tsx";

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
      const actions: WhiteboardActionRect[] = [];
      (Object.keys(ACTION_DOM_ID) as ActionType[]).forEach((id) => {
        const el = clone.querySelector<HTMLElement>(`#${ACTION_DOM_ID[id]}`);
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

      measureHost.remove();
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
