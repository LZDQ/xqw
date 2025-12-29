type ButtonOptions = {
  size?: number;
  onClick: () => void;
};

const BASE_STYLE = {
  width: 68,
  height: 68,
  fontSize: 18
};

function buildButton(
  label: string,
  color: string,
  opts: ButtonOptions
): HTMLButtonElement {
  const size = opts.size ?? BASE_STYLE.width;
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.width = `${size}px`;
  btn.style.height = `${size}px`;
  btn.style.borderRadius = "50%";
  btn.style.fontSize = `${BASE_STYLE.fontSize}px`;
  btn.style.fontWeight = "800";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.color = "#fff";
  btn.style.background = color;
  btn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.16)";
  btn.style.padding = "0";
  btn.style.lineHeight = "1";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.boxSizing = "border-box";
  btn.style.setProperty("appearance", "none");
  btn.style.setProperty("-webkit-appearance", "none");
  btn.style.setProperty("-moz-appearance", "none");
  btn.style.outline = "none";
  btn.onclick = opts.onClick;
  return btn;
}

export function createCancelCircle(onClick: () => void, size?: number): HTMLButtonElement {
  return buildButton("取消", "linear-gradient(135deg,#ef4444,#b91c1c)", { onClick, size });
}

export function createConfirmCircle(onClick: () => void, size?: number): HTMLButtonElement {
  return buildButton("确认", "linear-gradient(135deg,#10b981,#047857)", { onClick, size });
}
