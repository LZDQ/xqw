import type * as THREEType from "three";

export interface WhiteboardDisplay {
  mesh: THREEType.Mesh;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  render: (draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void, debugLabel?: string) => void;
}

export interface WhiteboardDisplayOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  width: number;
  height: number;
  offset: THREEType.Vector3;
}

export function createWhiteboardDisplay(
  THREE: typeof THREEType,
  parent: THREEType.Object3D,
  options: WhiteboardDisplayOptions
): WhiteboardDisplay {
  const canvas = document.createElement("canvas");
  canvas.width = options.canvasWidth ?? 2048;
  canvas.height = options.canvasHeight ?? 1024;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create 2D canvas context for whiteboard display");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    toneMapped: false,
  });

  const geometry = new THREE.PlaneGeometry(options.width, options.height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "WhiteboardDisplay";
  mesh.frustumCulled = false;
  mesh.renderOrder = 999;
  mesh.position.copy(options.offset);
  parent.add(mesh);

  const render = (
    draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
    debugLabel = "layout"
  ): void => {
    draw(ctx, canvas);
    texture.needsUpdate = true;

    // const worldPos = mesh.getWorldPosition(new THREE.Vector3());
    // console.debug("[whiteboard] rendered", {
    //   label: debugLabel,
    //   displayWorld: { x: worldPos.x, y: worldPos.y, z: worldPos.z }
    // });
  };

  texture.needsUpdate = true;

  return { mesh, canvas, width: options.width, height: options.height, render };
}
