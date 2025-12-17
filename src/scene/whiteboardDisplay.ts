import type * as THREEType from "three";

export interface WhiteboardDisplay {
  mesh: THREEType.Mesh;
  canvas: HTMLCanvasElement;
  setText: (text: string) => void;
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
  canvas.width = options.canvasWidth ?? 1024;
  canvas.height = options.canvasHeight ?? 512;

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
    // Render "on top" of the board to avoid being hidden by the GLTF surface due to z-fighting / depth.
    depthTest: false,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(options.width, options.height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "WhiteboardDisplay";
  mesh.frustumCulled = false;
  mesh.renderOrder = 999;
  mesh.position.copy(options.offset);
  parent.add(mesh);

  const setText = (text: string): void => {
    drawBoard(ctx, canvas, text);
    texture.needsUpdate = true;

    const worldPos = mesh.getWorldPosition(new THREE.Vector3());
    console.info("[whiteboard] rendered text", {
      textPreview: text.slice(0, 120),
      displayWorld: { x: worldPos.x, y: worldPos.y, z: worldPos.z }
    });
  };

  setText("OI Trainer 3D\n(whiteboard display ready)");

  return { mesh, canvas, setText };
}

function drawBoard(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string): void {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#2b2f36";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  const pad = 50;
  const maxWidth = w - pad * 2;
  const lineHeight = 74;

  ctx.fillStyle = "#0f172a";
  ctx.font = "64px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.textBaseline = "top";

  const lines = wrapText(ctx, text, maxWidth);
  let y = pad;
  for (const line of lines) {
    if (y + lineHeight > h - pad) break;
    ctx.fillText(line, pad, y);
    y += lineHeight;
  }

  ctx.fillStyle = "#475569";
  ctx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText("Click to lock mouse, WASD to move", pad, h - pad - 34);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const rawLines = text.split("\n");
  const out: string[] = [];

  for (const rawLine of rawLines) {
    if (!rawLine) {
      out.push("");
      continue;
    }

    let line = "";
    for (const ch of Array.from(rawLine)) {
      const next = line + ch;
      if (ctx.measureText(next).width > maxWidth && line.length > 0) {
        out.push(line);
        line = ch;
      } else {
        line = next;
      }
    }
    out.push(line);
  }

  return out;
}
