import type { CSSProperties } from "./types.ts";

type Child = Node | string | number | boolean | null | undefined;
type Children = Child | Child[];

export const Fragment = (props: { children?: Children }): Children => props.children ?? null;

export function jsx(type: any, props: any, _key?: any): Node {
  return createNode(type, props);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

function createNode(type: any, props: any): Node {
  const normalizedProps = props ?? {};
  const { children, ...rest } = normalizedProps;

  if (typeof type === "function") {
    return type({ ...rest, children });
  }

  const el = document.createElement(type as string);
  applyProps(el, rest);
  appendChildren(el, children);
  return el;
}

function applyProps(el: HTMLElement, props: Record<string, any>): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || key === "children") continue;
    if (key === "className") {
      el.className = String(value);
    } else if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value as CSSProperties);
    } else if (key === "dangerouslySetInnerHTML" && value?.__html !== undefined) {
      el.innerHTML = String(value.__html);
    } else if (value === true) {
      el.setAttribute(key, "");
    } else if (value === false) {
      // Skip falsey boolean attributes
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function appendChildren(el: HTMLElement, children: Children): void {
  if (children === undefined || children === null || children === false) return;
  if (Array.isArray(children)) {
    children.forEach((child) => appendChildren(el, child));
    return;
  }
  if (typeof children === "string" || typeof children === "number") {
    el.appendChild(document.createTextNode(String(children)));
    return;
  }
  if (children instanceof Node) {
    el.appendChild(children);
  }
}

declare global {
  namespace JSX {
    type Element = Node;
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
