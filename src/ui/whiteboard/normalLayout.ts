import type * as THREEType from "three";
import type { GameState } from "../../core/GameState.ts";
import type { WhiteboardDisplay } from "../../scene/whiteboardDisplay.ts";
import type { ActionType } from "../../lib/enums.ts";

export interface ActionSpec {
  id: ActionType;
  title: string;
  description: string;
}

export interface ActionButton {
  id: ActionType;
  root: THREEType.Object3D;
}

export function getNormalActions(): ActionSpec[] {
  return [
    { id: "TRAIN", title: "训练", description: "安排学生进行专项训练，提高实力" },
    { id: "RELAX", title: "娱乐", description: "放松娱乐，缓解压力，提高舒适度" },
    { id: "MOCK", title: "模拟赛", description: "进行内部模拟比赛，检验训练成果" },
    { id: "CAMP", title: "集训", description: "参加合适的外出集训，集中提升训练效率" },
  ];
}

export function renderNormalLayout(display: WhiteboardDisplay, gameState: GameState): void {
  display.render((ctx, canvas) => {
    const w = canvas.width;
    const h = canvas.height;

    const bg = "#fbfdff";
    const border = "#e5e7eb";
    const text = "#111827";
    const muted = "#6b7280";
    const accent = "#2563eb";

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // Header (meta line only; no big title text)
    const headerH = Math.round(h * 0.14);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, headerH);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, headerH);
    ctx.lineTo(w, headerH);
    ctx.stroke();

    const week = gameState.week || 1;
    const provinceName = gameState.provinceName || `省份ID ${gameState.provinceId}`;
    const money = formatMoney(gameState.budget);
    const reputation = String(gameState.reputation);
    const weather = gameState.weather || "未知";
    const temperature = `${gameState.temperature}°C`;

    ctx.fillStyle = muted;
    ctx.font = "500 26px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle";
    const metaLine = `第 ${week} 周   省份：${provinceName}   经费：${money}   声誉：${reputation}   天气：${weather} / 温度：${temperature}`;
    drawLeftAligned(ctx, metaLine, 48, headerH / 2);

    // Content area (two columns)
    const pad = 44;
    const top = headerH + pad;
    const bottom = h - pad;
    const contentH = bottom - top;

    const gutter = 40;
    const leftW = Math.round((w - pad * 2 - gutter) * 0.52);
    const rightW = w - pad * 2 - gutter - leftW;
    const leftX = pad;
    const rightX = leftX + leftW + gutter;

    // Left: meta card (auto-height, grows with text)
    drawSectionTitle(ctx, "本周信息", leftX, top, accent);
    const leftCardY = top + 46;
    const lineX = leftX + 32;
    const innerPadY = 22;
    const maxCardW = leftW;
    const kvMaxW = maxCardW - 64;

    // Measure required content height
    let y = leftCardY + innerPadY;
    const contentStartY = y;
    ctx.textBaseline = "top";
    ctx.fillStyle = text;
    ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    y += 40;
    ctx.font = "500 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    y = measureKeyValue(ctx, "省份", provinceName, lineX, y, kvMaxW);
    y = measureKeyValue(ctx, "经费", money, lineX, y, kvMaxW);
    y = measureKeyValue(ctx, "声誉", reputation, lineX, y, kvMaxW);
    y = measureKeyValue(ctx, "天气", weather, lineX, y, kvMaxW);
    y = measureKeyValue(ctx, "温度", temperature, lineX, y, kvMaxW);
    const requiredH = (y - contentStartY) + innerPadY + 10;
    const leftCardH = Math.min(Math.max(220, requiredH), contentH);

    drawCard(ctx, leftX, leftCardY, leftW, leftCardH);

    // Draw content into the card
    y = leftCardY + innerPadY;
    ctx.fillStyle = text;
    ctx.font = "700 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    ctx.fillText(`第 ${week} 周`, lineX, y);
    y += 44;

    y = drawKeyValue(ctx, "省份", provinceName, lineX, y, kvMaxW);
    y = drawKeyValue(ctx, "经费", money, lineX, y, kvMaxW);
    y = drawKeyValue(ctx, "声誉", reputation, lineX, y, kvMaxW);
    y = drawKeyValue(ctx, "天气", weather, lineX, y, kvMaxW);
    y = drawKeyValue(ctx, "温度", temperature, lineX, y, kvMaxW);

    // Right: reserved for future 3D buttons / event-specific layouts.
    drawSectionTitle(ctx, "本周行动（每个行动持续 1 周）", rightX, top, accent);

    const actions = getNormalActions();
    const listTop = top + 46;
    const listBottom = bottom;
    const listH = listBottom - listTop;
    const cardGap = 18;
    const cardH = Math.floor((listH - cardGap * (actions.length - 1)) / actions.length);

    let cardY = listTop;
    for (const action of actions) {
      drawCard(ctx, rightX, cardY, rightW, cardH);

      ctx.fillStyle = text;
      ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(action.title, rightX + 22, cardY + 18);

      ctx.fillStyle = muted;
      ctx.font = "500 22px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
      const descMaxW = rightW - 44;
      const descLines = wrapText(ctx, action.description, descMaxW);
      let descY = cardY + 56;
      for (const line of descLines.slice(0, 2)) {
        ctx.fillText(line, rightX + 22, descY);
        descY += 28;
      }

      cardY += cardH + cardGap;
    }
  }, "normal");
}

export function createNormalActionButtons(
  THREE: typeof THREEType,
  display: WhiteboardDisplay
): ActionButton[] {
  const board = display.mesh.parent;
  if (!board) return [];

  const actions = getNormalActions();

  // Map a "virtual layout" in meters to match the canvas layout proportions.
  const boardW = display.width;
  const boardH = display.height;

  const headerH = boardH * 0.14;
  const pad = boardH * 0.06;
  const top = boardH / 2 - headerH - pad;
  const bottom = -boardH / 2 + pad;
  const contentH = top - bottom;

  const gutter = boardW * 0.06;
  const usableW = boardW - pad * 2 - gutter;
  const leftW = usableW * 0.52;
  const rightW = usableW - leftW;
  const rightX0 = -boardW / 2 + pad + leftW + gutter;
  const rightX1 = rightX0 + rightW;
  const rightXCenter = (rightX0 + rightX1) / 2;

  const listTop = top - 0.26; // section title height approximation
  const listBottom = bottom;
  const listH = listTop - listBottom;
  const gap = 0.07;
  const cardH = (listH - gap * (actions.length - 1)) / actions.length;
  const cardW = rightW;

  const depth = 0.08;
  const buttons: ActionButton[] = [];
  let y = listTop - cardH / 2;
  for (const action of actions) {
    const root = new THREE.Group();
    root.name = `Button_${action.id}`;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cardW * 0.98, cardH * 0.9, depth),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.12
      })
    );
    box.position.set(0, 0, depth / 2 + 0.006);
    box.userData.kind = "button";
    box.userData.actionId = action.id;
    box.userData.actionTitle = action.title;
    root.userData.kind = "button";
    root.userData.actionId = action.id;
    root.userData.actionTitle = action.title;
    root.add(box);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(box.geometry),
      new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 })
    );
    edge.position.copy(box.position);
    root.add(edge);

    root.position.set(rightXCenter, y, 0);
    board.add(root);
    buttons.push({ id: action.id, root });
    y -= cardH + gap;
  }

  return buttons;
}

function formatMoney(value: number): string {
  const n = Number.isFinite(value) ? Math.floor(value) : 0;
  return `¥${n.toLocaleString("zh-CN")}`;
}

function drawLeftAligned(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.textAlign = "left";
  ctx.fillText(text, x, y);
}

function drawSectionTitle(ctx: CanvasRenderingContext2D, title: string, x: number, y: number, accent: string): void {
  ctx.fillStyle = accent;
  ctx.font = "700 30px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(title, x, y);
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const r = 22;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

function drawKeyValue(
  ctx: CanvasRenderingContext2D,
  key: string,
  value: string,
  x: number,
  y: number,
  maxW: number
): number {
  ctx.fillStyle = "#6b7280";
  ctx.font = "600 22px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText(`${key}：`, x, y);

  ctx.fillStyle = "#111827";
  ctx.font = "500 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  const keyW = ctx.measureText(`${key}：`).width;
  const lines = wrapText(ctx, value, maxW - keyW);
  let yy = y;
  for (const line of lines.slice(0, 2)) {
    ctx.fillText(line, x + keyW, yy);
    yy += 30;
  }
  return yy + 18;
}

function measureKeyValue(
  ctx: CanvasRenderingContext2D,
  key: string,
  value: string,
  x: number,
  y: number,
  maxW: number
): number {
  // Keep in sync with drawKeyValue spacing.
  const keyW = ctx.measureText(`${key}：`).width;
  const lines = wrapText(ctx, value, maxW - keyW);
  const lineCount = Math.min(2, Math.max(1, lines.length));
  return y + lineCount * 30 + 18;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line.length > 0) {
      out.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
