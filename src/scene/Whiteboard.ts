import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { GameState } from "../core/GameState.ts";
import type { ActionType } from "../lib/enums.ts";
import {
  consumeRenderRequest,
  createWhiteboardUI,
  getWhiteboardView,
} from "../ui/whiteboard.tsx";

export class Whiteboard {
  public cssObject: CSS3DObject;
  public mesh: THREE.Mesh;
  public resolution: { width: number; height: number };
  private rootElement: HTMLElement; // persistent element holding inner elements
  private readonly domWidth: number = 1400;

  constructor(width: number, height: number) {
    const domHeight = Math.round(this.domWidth * (height / width));
    this.resolution = { width: this.domWidth, height: domHeight };

    const root = document.createElement("div");
    root.style.width = `${this.domWidth}px`;
    root.style.height = `${this.resolution.height}px`;
    root.style.willChange = "transform";
    root.style.backfaceVisibility = "hidden";
    root.style.pointerEvents = "auto";
    this.rootElement = root;

    this.cssObject = new CSS3DObject(this.rootElement);
    const scale = width / this.domWidth;
    this.cssObject.scale.setScalar(scale);
    this.cssObject.name = "Whiteboard_Visual";

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0,
      blending: THREE.NoBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = "Whiteboard_Physics";
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.whiteboard = true;

    this.mesh.add(this.cssObject);
  }

  addToScene(
    webGLScene: THREE.Scene,
    cssScene: THREE.Scene,
    position: THREE.Vector3,
    rotationY?: number
  ): void {
    this.mesh.position.copy(position);
    if (rotationY !== undefined) {
      this.mesh.rotation.y = rotationY;
    }
    webGLScene.add(this.mesh);
    cssScene.add(this.cssObject);
    this.cssObject.position.copy(this.mesh.position);
    this.cssObject.quaternion.copy(this.mesh.quaternion);
    // this.cssObject.translateZ(1e-6);
  }

  render(gameState: GameState): void {
    this.rootElement.replaceChildren(createWhiteboardUI(gameState));
    // console.debug("[whiteboard] render", this.rootElement);
  }

  clickAction(actionId: ActionType): void {
    const card = this.rootElement.querySelector<HTMLElement>(`[data-action="${actionId}"]`);
    if (!card) return;
    card.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  }

  simulateClick(uv: THREE.Vector2, gameState: GameState): void {
    // console.debug("[whiteboard] simulate click", uv);
    const rect = this.rootElement.getBoundingClientRect();
    const clientX = rect.left + uv.x * rect.width;
    const clientY = rect.bottom - uv.y * rect.height;
    const elementUnderPointer = document.elementFromPoint(clientX, clientY);
    if (!elementUnderPointer) return;

    const previousView = getWhiteboardView();
    const evt = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      view: window,
    });
    (evt as any)._whiteboardSynthetic = true;
    elementUnderPointer.dispatchEvent(evt);
    const shouldRender = previousView !== getWhiteboardView() || consumeRenderRequest();
    if (shouldRender) {
      console.debug("should render");
      this.render(gameState);
    }
  }

  dispose(): void {
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    if (this.cssObject.parent) {
      this.cssObject.parent.remove(this.cssObject);
    }
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
    this.mesh.geometry.dispose();
    const material = this.mesh.material;
    if (Array.isArray(material)) {
      material.forEach((mat) => mat.dispose());
    } else {
      material.dispose();
    }
  }
}
