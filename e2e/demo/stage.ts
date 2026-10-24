export type Layer = "a" | "b";
export type Platform = "whatsapp" | "instagram" | "messenger" | "meli";
export type Tone = "green" | "blue" | "amber";
export type Enter = "cut" | "wipe-up" | "wipe-right" | "wipe-left" | "slide";

export type Line = { at: number; until: number; text: string; kind: "hero" | "title"; fast?: boolean };
export type Shot = { at: number; until: number; layer: Layer; enter: Enter };
export type Anchor = { layer: Layer; selector: string; dx: number; dy: number };
export type Chip = { at: number; until: number; text: string; tone: Tone; x?: number; y?: number; anchor?: Anchor };
export type Effect =
  | { kind: "typing"; layer: Layer; at: number; until: number }
  | { kind: "reveal"; layer: Layer; selector: string; at: number }
  | { kind: "pin-bottom"; layer: Layer; at: number; until: number }
  | { kind: "scroll"; layer: Layer; selector: string; at: number; until: number; from: number; to: number };
export type Notice = { platform: Platform; name: string; text: string };
export type Script = {
  lines: Line[];
  shots: Shot[];
  chips: Chip[];
  effects: Effect[];
  notices: Notice[];
  problem: { at: number; until: number; tidyAt: number; clockFrom: number; clockTo: number; clockUntil: number };
  turn: { at: number; until: number };
  closing: { at: number };
};
export type Assets = { logo: string; icons: Record<Platform, string> };

declare global {
  interface Window {
    promo: { load: (script: Script) => void; render: (t: number) => void };
  }
}

export const STAGE = { width: 1080, height: 1920, squareTop: 420, square: 1080 };
export const DEVICE = { left: 240, top: 210, width: 600, height: 840, scale: 1.5 };
export const FRAME = { width: DEVICE.width / DEVICE.scale, height: DEVICE.height / DEVICE.scale };

const css = `
  html, body { margin: 0; width: ${STAGE.width}px; height: ${STAGE.height}px; overflow: hidden; background: #0a1521; color: #eaeadc; font-family: "Inter Variable", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  * { box-sizing: border-box; }
  .light { position: absolute; left: 0; top: 0; width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border-radius: 50%; background: radial-gradient(circle, rgba(143, 193, 238, 0.2), rgba(143, 193, 238, 0.05) 38%, transparent 62%); }
  .grain { position: absolute; inset: 0; opacity: 0.07; mix-blend-mode: soft-light; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .square { position: absolute; left: 0; top: ${STAGE.squareTop}px; width: ${STAGE.square}px; height: ${STAGE.square}px; }
  .lines { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
  .line { position: absolute; left: 50%; width: 980px; margin: 0; transform: translateX(-50%); text-align: center; font-weight: 800; letter-spacing: -0.035em; text-wrap: balance; }
  .line-hero { top: 50%; translate: 0 -50%; font-size: 96px; line-height: 1.02; }
  .line-title { top: 36px; font-size: 60px; line-height: 1.1; }
  .word { display: inline-block; overflow: hidden; padding: 0.08em 0.04em 0.16em; margin: -0.08em -0.04em -0.16em; vertical-align: top; }
  .word-inner { display: inline-block; }
  .accent { color: #8fc1ee; }
  .problem, .turn, .flash, .closing, .device-halo, .light, .grain { pointer-events: none; }
  .problem { position: absolute; inset: 0; }
  .clock { position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-size: 104px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; font-variant-numeric: tabular-nums; color: #eaeadc; }
  .clock small { display: block; margin-top: 10px; font-size: 20px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #8fc1ee; }
  .clock small[data-tone="green"] { color: #5fd3a0; }
  .notices { position: absolute; left: 50%; top: 300px; width: 580px; height: 740px; margin-left: -290px; }
  .notice { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 18px; width: 580px; height: 84px; padding: 0 22px; border: 1px solid rgba(143, 193, 238, 0.16); border-radius: 22px; background: rgba(16, 30, 46, 0.94); box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4); }
  .notice-icon { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%; background: rgba(234, 234, 220, 0.06); }
  .notice-icon svg { width: 26px; height: 26px; }
  .notice-body { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .notice-top { display: flex; justify-content: space-between; gap: 12px; font-size: 21px; font-weight: 700; color: #f4f4ef; }
  .notice-time { font-weight: 500; color: #8a98a8; font-variant-numeric: tabular-nums; }
  .notice-text { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 19px; color: #b8c4d3; }
  .notice-state { flex-shrink: 0; padding: 7px 12px; border-radius: 999px; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
  .notice-state[data-tone="amber"] { background: rgba(242, 193, 78, 0.14); color: #f2c14e; }
  .notice-state[data-tone="green"] { background: rgba(95, 211, 160, 0.16); color: #5fd3a0; }
  .turn { position: absolute; inset: 0; z-index: 6; display: grid; place-items: center; }
  .turn-logo { position: absolute; width: 250px; height: 300px; color: #eaeadc; filter: drop-shadow(0 0 28px rgba(143, 193, 238, 0.45)); }
  .turn-logo svg { width: 100%; height: 100%; }
  .burst { position: absolute; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(143, 193, 238, 0.75), rgba(143, 193, 238, 0.18) 35%, transparent 65%); }
  .flash { position: absolute; z-index: 6; inset: -${STAGE.squareTop}px 0 -${STAGE.height - STAGE.squareTop - STAGE.square}px; background: #cfe3f6; }
  .device { position: absolute; left: ${DEVICE.left}px; top: ${DEVICE.top}px; width: ${DEVICE.width}px; height: ${DEVICE.height}px; overflow: hidden; border-radius: 38px; background: #0f1d2c; box-shadow: 0 0 0 1px rgba(143, 193, 238, 0.28), 0 50px 140px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.06); }
  .device iframe { display: block; width: ${FRAME.width}px; height: ${FRAME.height}px; border: 0; transform: scale(${DEVICE.scale}); transform-origin: 0 0; }
  .device-halo { position: absolute; left: ${DEVICE.left - 60}px; top: ${DEVICE.top + 40}px; width: ${DEVICE.width + 120}px; height: ${DEVICE.height}px; border-radius: 50%; background: radial-gradient(closest-side, rgba(143, 193, 238, 0.18), transparent); filter: blur(50px); }
  .chips { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
  .chip { position: absolute; display: inline-flex; align-items: center; gap: 12px; padding: 14px 24px 14px 18px; border: 1px solid; border-radius: 999px; background: rgba(10, 21, 33, 0.92); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); font-size: 25px; font-weight: 700; letter-spacing: -0.01em; white-space: nowrap; }
  .chip::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: currentColor; box-shadow: 0 0 14px currentColor; }
  .chip[data-tone="green"] { color: #5fd3a0; border-color: rgba(95, 211, 160, 0.5); }
  .chip[data-tone="blue"] { color: #8fc1ee; border-color: rgba(143, 193, 238, 0.5); }
  .chip[data-tone="amber"] { color: #f2c14e; border-color: rgba(242, 193, 78, 0.5); }
  .closing { position: absolute; inset: 0; z-index: 7; display: grid; justify-items: center; align-content: start; padding-top: 150px; text-align: center; }
  .closing-logo { width: 190px; height: 228px; color: #eaeadc; filter: drop-shadow(0 0 24px rgba(143, 193, 238, 0.4)); }
  .closing-logo svg { width: 100%; height: 100%; }
  .closing-word { margin-top: 26px; font-size: 74px; font-weight: 400; letter-spacing: 0.08em; line-height: 1; }
  .closing-word b { font-weight: 800; }
  .closing-line { margin: 54px 0 0; width: 900px; font-size: 66px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.08; text-wrap: balance; }
  .closing-cta { margin-top: 58px; padding: 24px 52px; border-radius: 999px; background: #eaeadc; color: #0a1521; font-size: 32px; font-weight: 800; letter-spacing: -0.01em; box-shadow: 0 18px 60px rgba(234, 234, 220, 0.22); }
  .closing-url { margin-top: 30px; font-size: 32px; font-weight: 600; color: #b8c4d3; letter-spacing: -0.01em; }
  .closing-note { margin-top: 44px; font-size: 20px; color: #5f6d80; }
`;

const frameCss = `
  .sidebar { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; scrollbar-width: none; }
  *::-webkit-scrollbar { display: none; }
  .typing { display: inline-flex; gap: 5px; align-items: center; padding: 6px 2px; }
  .typing i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
`;

export function stageHtml(assets: Assets) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>BoxLead promo</title>
<link rel="stylesheet" href="/node_modules/@fontsource-variable/inter/index.css">
<style>${css}</style></head><body>
<div class="light"></div><div class="grain"></div>
<section class="square">
  <div class="problem"><div class="clock"><span class="clock-value">03:00</span><small>Sin responder</small></div><div class="notices"></div></div>
  <div class="turn"><div class="burst"></div><div class="turn-logo">${assets.logo}</div></div>
  <div class="flash"></div>
  <div class="device-halo"></div>
  <div class="device" data-layer="a"><iframe title="BoxLead a"></iframe></div>
  <div class="device" data-layer="b"><iframe title="BoxLead b"></iframe></div>
  <div class="lines"></div>
  <div class="chips"></div>
  <div class="closing"><div class="closing-logo">${assets.logo}</div><div class="closing-word"><b>BOX</b>LEAD</div><p class="closing-line line"></p><div class="closing-cta">Sumate a la beta</div><div class="closing-url">boxlead.app</div><div class="closing-note">Datos de ejemplo</div></div>
</section>
<script>window.promoAssets = ${JSON.stringify(assets)}; window.promoFrameCss = ${JSON.stringify(frameCss)};</script>
<script>(${stageRuntime.toString()})();</script>
</body></html>`;
}

export function stageRuntime() {
  const { promoAssets: assets, promoFrameCss } = window as unknown as { promoAssets: Assets; promoFrameCss: string };
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const prog = (t: number, start: number, duration: number) => clamp((t - start) / duration);
  const outCubic = (p: number) => 1 - (1 - p) ** 3;
  const inOutCubic = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
  const outBack = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
  const seeded = (index: number, salt: number) => {
    const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const query = <T extends Element>(selector: string) => document.querySelector(selector) as T;
  const style = (element: HTMLElement | SVGElement, values: Record<string, string>) => {
    for (const [key, value] of Object.entries(values)) element.style.setProperty(key, value);
  };

  let script: Script;
  const lineElements: HTMLElement[] = [];
  const chipElements: HTMLElement[] = [];
  const noticeElements: HTMLElement[] = [];
  const revealed = new Set<string>();
  const devices = {
    a: query<HTMLElement>('.device[data-layer="a"]'),
    b: query<HTMLElement>('.device[data-layer="b"]'),
  };
  const frames = { a: devices.a.querySelector("iframe")!, b: devices.b.querySelector("iframe")! };
  const docOf = (layer: Layer) => frames[layer].contentDocument;

  for (const frame of Object.values(frames)) {
    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const extra = doc.createElement("style");
      extra.textContent = promoFrameCss;
      doc.head.append(extra);
    });
  }

  function words(target: HTMLElement, text: string) {
    target.innerHTML = "";
    for (const token of text.split(" ")) {
      const accent = token.startsWith("*") && token.endsWith("*");
      const word = document.createElement("span");
      word.className = "word";
      const inner = document.createElement("span");
      inner.className = accent ? "word-inner accent" : "word-inner";
      inner.textContent = accent ? token.slice(1, -1) : token;
      word.append(inner);
      target.append(word, document.createTextNode(" "));
    }
  }

  function animateWords(target: HTMLElement, t: number, start: number, end: number, fast: boolean) {
    const visible = t >= start && t < end;
    target.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    const stagger = fast ? 0.05 : 0.08;
    const duration = fast ? 0.34 : 0.46;
    target.querySelectorAll<HTMLElement>(".word-inner").forEach((inner, index) => {
      const p = outCubic(prog(t, start + index * stagger, duration));
      inner.style.transform = `translateY(${(1 - p) * 112}%)`;
    });
    const leave = outCubic(prog(t, end - 0.3, 0.3));
    style(target, { opacity: String(1 - leave), "--leave": `${-leave * 22}px` });
    target.style.transform = `translateX(-50%) translateY(${-leave * 22}px)`;
  }

  function formatClock(minutes: number) {
    const hours = Math.floor(minutes / 60) % 24;
    const rest = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function clockAt(t: number) {
    const { clockFrom, clockTo, clockUntil, at } = script.problem;
    return clockFrom + (clockTo - clockFrom) * inOutCubic(prog(t, at, clockUntil - at));
  }

  const noticeArrival = (index: number) => script.problem.at + 0.25 + index * 0.52;

  function renderProblem(t: number) {
    const { at, until, tidyAt } = script.problem;
    const panel = query<HTMLElement>(".problem");
    const visible = t >= at && t < until;
    panel.style.display = visible ? "" : "none";
    if (!visible) return;
    const dim = t >= script.turn.at ? 1 - 0.65 * outCubic(prog(t, script.turn.at, 0.5)) + 0.65 * outCubic(prog(t, tidyAt, 0.3)) : 1;
    const leave = prog(t, until - 0.3, 0.3);
    panel.style.opacity = String(dim * (1 - leave));
    query<HTMLElement>(".clock-value").textContent = formatClock(clockAt(t));
    const label = query<HTMLElement>(".clock small");
    label.textContent = t >= tidyAt + 0.12 ? "Respondido" : "Sin responder";
    label.dataset.tone = t >= tidyAt + 0.12 ? "green" : "";
    const tidy = outCubic(prog(t, tidyAt, 0.4));
    const arrived = noticeElements.filter((_, index) => t >= noticeArrival(index)).length;
    noticeElements.forEach((element, index) => {
      const arrival = noticeArrival(index);
      const shown = t >= arrival;
      element.style.visibility = shown ? "visible" : "hidden";
      if (!shown) return;
      const enter = outBack(prog(t, arrival, 0.5));
      const slot = arrived - 1 - index;
      const settle = outCubic(prog(t, noticeArrival(arrived - 1), 0.45));
      const y = (slot - 1 + settle) * 94 + (1 - enter) * -60;
      const mess = 1 - tidy;
      const rotate = (seeded(index, 1) - 0.5) * 7 * mess;
      const shift = (seeded(index, 2) - 0.5) * 70 * mess;
      const fade = slot >= 6 ? 1 - Math.min(1, slot - 5) : 1;
      style(element, {
        transform: `translate(${shift}px, ${y}px) rotate(${rotate}deg) scale(${0.9 + 0.1 * enter})`,
        opacity: String(enter * (0.45 + 0.55 * fade)),
      });
      const state = element.querySelector<HTMLElement>(".notice-state")!;
      const done = t >= tidyAt + 0.12 + index * 0.05;
      state.dataset.tone = done ? "green" : "amber";
      state.textContent = done ? "Respondido" : "Sin responder";
      element.querySelector<HTMLElement>(".notice-time")!.textContent = formatClock(clockAt(arrival));
    });
  }

  let logoLengths: number[] = [];
  function drawLogo(root: HTMLElement, p: number) {
    const paths = root.querySelectorAll<SVGPathElement>("path");
    if (logoLengths.length !== paths.length) logoLengths = Array.from(paths, (path) => path.getTotalLength());
    paths.forEach((path, index) => {
      const length = logoLengths[index];
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length * (1 - p));
    });
  }

  function renderTurn(t: number) {
    const { at, until } = script.turn;
    const turn = query<HTMLElement>(".turn");
    const visible = t >= at && t < until;
    turn.style.visibility = visible ? "visible" : "hidden";
    const flash = query<HTMLElement>(".flash");
    const burstAt = at + 1.15;
    const flashP = prog(t, burstAt, 0.4);
    flash.style.opacity = String(t >= burstAt && t < burstAt + 0.4 ? 0.5 * (1 - outCubic(flashP)) : 0);
    if (!visible) return;
    const logo = turn.querySelector<HTMLElement>(".turn-logo")!;
    drawLogo(logo, inOutCubic(prog(t, at, 1.2)));
    const leave = outCubic(prog(t, until - 0.65, 0.45));
    style(logo, { transform: `scale(${1 + 0.18 * leave})`, opacity: String(1 - leave) });
    const burst = turn.querySelector<HTMLElement>(".burst")!;
    const b = prog(t, burstAt, 0.7);
    style(burst, { transform: `scale(${0.2 + 1.5 * outCubic(b)})`, opacity: String(t >= burstAt ? (1 - b) * 0.9 : 0) });
  }

  function clipFor(enter: Enter, p: number) {
    const rest = (1 - p) * 100;
    if (enter === "wipe-up") return `inset(${rest}% 0 0 0 round 38px)`;
    if (enter === "wipe-right") return `inset(0 ${rest}% 0 0 round 38px)`;
    if (enter === "wipe-left") return `inset(0 0 0 ${rest}% round 38px)`;
    return "none";
  }

  function renderDevices(t: number) {
    const index = script.shots.findIndex((shot, position) => t >= shot.at && (position === script.shots.length - 1 || t < script.shots[position + 1].at));
    const current = index >= 0 ? script.shots[index] : null;
    const previous = index > 0 ? script.shots[index - 1] : null;
    const halo = query<HTMLElement>(".device-halo");
    for (const layer of ["a", "b"] as Layer[]) {
      const device = devices[layer];
      let opacity = 0;
      let clip = "none";
      let shift = 0;
      if (current && layer === current.layer && t < current.until) {
        const p = current.enter === "cut" ? 1 : outCubic(prog(t, current.at, 0.5));
        opacity = current.enter === "slide" ? p : 1;
        clip = clipFor(current.enter, p);
        shift = current.enter === "slide" ? (1 - p) * 50 : 0;
      } else if (current && previous && layer === previous.layer && layer !== current.layer && t < current.at + 0.5) {
        opacity = 1;
      }
      if (current && t >= current.until && layer === current.layer) {
        const leave = outCubic(prog(t, current.until, 0.45));
        opacity = 1 - leave;
        shift = leave * 60;
      }
      style(device, { opacity: String(opacity), "clip-path": clip, transform: `translateY(${shift}px)`, "z-index": current && layer === current.layer ? "2" : "1" });
    }
    const active = current ? (t < current.until ? 1 : 1 - outCubic(prog(t, current.until, 0.45))) : 0;
    halo.style.opacity = String(active * (current ? outCubic(prog(t, current.at, 0.6)) : 0));
  }

  function renderEffects(t: number) {
    for (const effect of script.effects) {
      const doc = docOf(effect.layer);
      if (!doc) continue;
      if (effect.kind === "reveal") {
        const target = doc.querySelector<HTMLElement>(effect.selector);
        if (!target) continue;
        const key = `${effect.layer}:${effect.selector}`;
        const p = outCubic(prog(t, effect.at, 0.4));
        target.style.display = t >= effect.at ? "" : "none";
        style(target, { opacity: String(p), transform: `translateY(${(1 - p) * 14}px)` });
        if (t >= effect.at) revealed.add(key);
      }
      if (effect.kind === "typing") {
        const list = doc.querySelector<HTMLElement>(".bubble-list:last-of-type");
        if (!list) continue;
        let bubble = list.querySelector<HTMLElement>(".promo-typing");
        const show = t >= effect.at && t < effect.until;
        if (show && !bubble) {
          bubble = doc.createElement("li");
          bubble.className = "bubble bubble-outbound promo-typing";
          bubble.innerHTML = `<span class="bubble-content"><span class="typing"><i></i><i></i><i></i></span></span>`;
          list.append(bubble);
        }
        if (bubble) {
          const enter = outBack(prog(t, effect.at, 0.35));
          style(bubble, { display: show ? "" : "none", opacity: String(enter), transform: `scale(${0.8 + 0.2 * enter})`, "transform-origin": "100% 100%" });
          bubble.querySelectorAll<HTMLElement>(".typing i").forEach((dot, index) => {
            dot.style.opacity = String(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 9 - index * 1.1)));
          });
        }
      }
      if (effect.kind === "pin-bottom" && t >= effect.at && t < effect.until) {
        const scroller = doc.querySelector<HTMLElement>(".conversation-scroll");
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      }
      if (effect.kind === "scroll") {
        const scroller = doc.querySelector<HTMLElement>(effect.selector);
        if (!scroller) continue;
        const p = inOutCubic(prog(t, effect.at, effect.until - effect.at));
        if (t >= effect.at - 0.5) scroller.scrollTop = effect.from + (effect.to - effect.from) * p;
      }
    }
  }

  function anchorPoint(anchor: Anchor) {
    const doc = docOf(anchor.layer);
    const target = doc?.querySelector(anchor.selector);
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    const device = devices[anchor.layer].getBoundingClientRect();
    const square = query<HTMLElement>(".square").getBoundingClientRect();
    return {
      x: device.left - square.left + rect.right * DEVICE_SCALE + anchor.dx,
      y: device.top - square.top + rect.top * DEVICE_SCALE + anchor.dy,
    };
  }
  const DEVICE_SCALE = 1.5;

  function renderChips(t: number) {
    script.chips.forEach((chip, index) => {
      const element = chipElements[index];
      const visible = t >= chip.at && t < chip.until;
      element.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;
      const point = chip.anchor ? anchorPoint(chip.anchor) : { x: chip.x ?? 0, y: chip.y ?? 0 };
      if (!point) {
        element.style.visibility = "hidden";
        return;
      }
      const enter = outBack(prog(t, chip.at, 0.45));
      const leave = outCubic(prog(t, chip.until - 0.25, 0.25));
      style(element, {
        left: `${point.x}px`,
        top: `${point.y}px`,
        transform: `translate(-100%, -50%) scale(${0.6 + 0.4 * enter}) translateY(${leave * 10}px)`,
        opacity: String(Math.min(enter, 1) * (1 - leave)),
      });
    });
  }

  function renderClosing(t: number) {
    const { at } = script.closing;
    const closing = query<HTMLElement>(".closing");
    const visible = t >= at;
    closing.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    drawLogo(closing.querySelector<HTMLElement>(".closing-logo")!, inOutCubic(prog(t, at + 0.1, 0.9)));
    const rise = (selector: string, start: number) => {
      const p = outCubic(prog(t, start, 0.6));
      style(query<HTMLElement>(selector), { opacity: String(p), transform: `translateY(${(1 - p) * 26}px)` });
    };
    rise(".closing-word", at + 0.55);
    const line = closing.querySelector<HTMLElement>(".closing-line")!;
    line.style.position = "static";
    animateWords(line, t, at + 1.0, Number.POSITIVE_INFINITY, false);
    line.style.transform = "none";
    const cta = query<HTMLElement>(".closing-cta");
    const pop = outBack(prog(t, at + 2.0, 0.55));
    style(cta, { opacity: String(Math.min(1, pop)), transform: `scale(${0.7 + 0.3 * pop})` });
    rise(".closing-url", at + 2.35);
    rise(".closing-note", at + 2.7);
  }

  function renderLight(t: number) {
    const light = query<HTMLElement>(".light");
    const x = 540 + Math.sin(t * 0.35) * 140;
    const y = 900 + Math.cos(t * 0.27) * 120;
    style(light, { transform: `translate(${x}px, ${y}px) scale(${1 + 0.06 * Math.sin(t * 0.8)})` });
  }

  window.promo = {
    load(next) {
      script = next;
      const lines = query<HTMLElement>(".lines");
      lines.innerHTML = "";
      lineElements.length = 0;
      for (const line of script.lines) {
        const element = document.createElement("p");
        element.className = `line line-${line.kind}`;
        words(element, line.text);
        lines.append(element);
        lineElements.push(element);
      }
      const chips = query<HTMLElement>(".chips");
      chips.innerHTML = "";
      chipElements.length = 0;
      for (const chip of script.chips) {
        const element = document.createElement("span");
        element.className = "chip";
        element.dataset.tone = chip.tone;
        element.textContent = chip.text;
        chips.append(element);
        chipElements.push(element);
      }
      const notices = query<HTMLElement>(".notices");
      notices.innerHTML = "";
      noticeElements.length = 0;
      for (const notice of script.notices) {
        const element = document.createElement("div");
        element.className = "notice";
        element.innerHTML = `<span class="notice-icon">${assets.icons[notice.platform]}</span><span class="notice-body"><span class="notice-top"><span></span><span class="notice-time"></span></span><span class="notice-text"></span></span><span class="notice-state" data-tone="amber">Sin responder</span>`;
        element.querySelector<HTMLElement>(".notice-top span")!.textContent = notice.name;
        element.querySelector<HTMLElement>(".notice-text")!.textContent = notice.text;
        notices.prepend(element);
        noticeElements.push(element);
      }
      words(query<HTMLElement>(".closing-line"), "*Nunca* *más* un mensaje sin responder.");
    },
    render(t) {
      renderLight(t);
      script.lines.forEach((line, index) => animateWords(lineElements[index], t, line.at, line.until, Boolean(line.fast)));
      renderProblem(t);
      renderTurn(t);
      renderDevices(t);
      renderEffects(t);
      renderChips(t);
      renderClosing(t);
    },
  };
}
