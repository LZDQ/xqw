import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import type * as THREEType from "three";
import type { GameState } from "../core/GameState.ts";
import type { Student } from "../core/Student.ts";
import { KNOWLEDGE } from "../lib/enums.ts";
import {
  renderStudentCard,
  getQualificationStatus,
  type QualificationStatus
} from "../ui/studentCard.ts";

type Hit = {
  target: THREEType.Object3D;
} | null;

export class StudentLabel {
  private THREE: typeof THREEType;
  private cssScene: THREEType.Scene;
  private camera: THREEType.Camera;
  private gameState: GameState;
  private object: CSS3DObject | null = null;
  private rootEl: HTMLElement | null = null;
  private currentAnchor: THREEType.Object3D | null = null;
  private lastSignature: string | null = null;

  constructor(THREE: typeof THREEType, cssScene: THREEType.Scene, camera: THREEType.Camera, gameState: GameState) {
    this.THREE = THREE;
    this.cssScene = cssScene;
    this.camera = camera;
    this.gameState = gameState;
  }

  setTarget(hit: Hit): void {
    if (!hit) {
      this.hide();
      return;
    }
    const anchor = this.getAnchor(hit.target);
    const student = this.getStudentFromObject(hit.target);
    if (!anchor || !student) {
      this.hide();
      return;
    }
    this.ensureObject();
    this.currentAnchor = anchor;
    this.renderContent(student);
    this.updateTransform();
    if (this.object && !this.object.parent) {
      this.cssScene.add(this.object);
    }
    if (this.object) {
      this.object.visible = true;
    }
  }

  tick(): void {
    if (!this.object || !this.currentAnchor) return;
    this.updateTransform();
  }

  hide(): void {
    this.currentAnchor = null;
    this.lastSignature = null;
    if (this.object) {
      this.object.visible = false;
    }
  }

  private ensureObject(): void {
    if (this.object && this.rootEl) return;
    this.rootEl = document.createElement("div");
    this.rootEl.className = "student-card student-overlay";
    this.rootEl.style.pointerEvents = "none";
    const obj = new CSS3DObject(this.rootEl);
    obj.scale.setScalar(0.004);
    this.object = obj;
  }

  private getAnchor(obj: THREEType.Object3D): THREEType.Object3D | null {
    let cur: THREEType.Object3D | null = obj;
    while (cur) {
      if (cur.userData?.studentRef || cur.userData?.studentName) return cur;
      cur = cur.parent;
    }
    return null;
  }

  private getStudentFromObject(obj: THREEType.Object3D): Student | null {
    let cur: THREEType.Object3D | null = obj;
    while (cur) {
      const ref = cur.userData?.studentRef as Student | undefined;
      if (ref) return ref;
      const name = cur.userData?.studentName as string | undefined;
      if (name) {
        const found = this.gameState.students.find(s => s.name === name);
        if (found) return found;
      }
      cur = cur.parent;
    }
    return null;
  }

  private updateTransform(): void {
    if (!this.object || !this.currentAnchor) return;
    const pos = new this.THREE.Vector3();
    this.currentAnchor.getWorldPosition(pos);
    const offset = typeof this.currentAnchor.userData?.labelOffset === "number"
      ? this.currentAnchor.userData.labelOffset
      : 1.6;
    pos.y += offset;
    this.object.position.copy(pos);
    this.object.lookAt(this.camera.position);
  }

  private renderContent(student: Student): void {
    if (!this.rootEl) return;
    const qual = getQualificationStatus(this.gameState, student);
    const signature = this.buildSignature(student, qual);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    renderStudentCard(this.rootEl, student, this.gameState, { includeQualification: true });
  }

  private buildSignature(student: Student, qual: QualificationStatus): string {
    const knowledgeVals = Object.keys(KNOWLEDGE)
      .map(key => Math.floor(student.knowledge[key as keyof typeof KNOWLEDGE] ?? 0))
      .join("|");
    const talents = Array.from(student.talents).join(",");
    return [
      student.name,
      Math.floor(student.thinking),
      Math.floor(student.coding),
      knowledgeVals,
      talents,
      qual.label,
    ].join("::");
  }
}
