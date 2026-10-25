export type Layer = "a" | "b";
export type Platform = "whatsapp" | "instagram" | "messenger" | "meli";
export type Tone = "green" | "blue" | "amber";
export type Enter = "cut" | "wipe-up" | "wipe-right" | "wipe-left" | "slide";

export type Line = { at: number; until: number; text: string; kind: "hero" | "title"; fast?: boolean; kicker?: string };
export type Focus = { selector: string; zoom?: number; align?: "center" | "top" | "keep"; ring?: boolean };
export type Shot = { at: number; until: number; layer: Layer; enter: Enter; focus?: Focus };
export type Anchor = { layer: Layer; selector: string; dx: number; dy: number };
export type Chip = { at: number; until: number; text: string; tone: Tone; x?: number; y?: number; anchor?: Anchor };
export type Effect =
  | { kind: "typing"; layer: Layer; at: number; until: number }
  | { kind: "reveal"; layer: Layer; selector: string; at: number }
  | { kind: "pin-bottom"; layer: Layer; at: number; until: number };
export type Notice = { platform: Platform; name: string; text: string; time?: string };
export type StreamItem = { platform: Platform; name: string; state: string };
export type Gauge = { kind: "clock" | "duration"; from: number; to: number; until: number };
export type Problem = { at: number; until: number; tidyAt: number; gauge: Gauge; label: string; doneLabel: string; doneValue?: string };
export type Script = {
  lines: Line[];
  shots: Shot[];
  chips: Chip[];
  effects: Effect[];
  notices: Notice[];
  problem: Problem;
  turn: { at: number; until: number };
  arrival: { at: number; until: number; notice: Notice; time: string };
  channels: { at: number; until: number };
  pulses: Array<{ at: number; tone: Tone }>;
  stream: { at: number; until: number; items: StreamItem[] };
  closing: { at: number };
};
export type Assets = { logo: string; icons: Record<Platform, string> };

declare global {
  interface Window {
    promo: { load: (script: Script) => void; render: (t: number) => void };
  }
}

export type Format = "vertical" | "square";
export type Layout = {
  width: number;
  height: number;
  boxTop: number;
  boxHeight: number;
  device: { left: number; top: number; width: number; height: number; scale: number };
  crop: boolean;
  titleTop: number;
  clockTop: number;
  noticesTop: number;
  visibleSlots: number;
  channelsTop: number;
  closingTop: number;
};

export const LAYOUTS: Record<Format, Layout> = {
  vertical: {
    width: 1080,
    height: 1920,
    boxTop: 250,
    boxHeight: 1270,
    device: { left: 220, top: 250, width: 640, height: 1000, scale: 1.6 },
    crop: false,
    titleTop: 56,
    clockTop: 170,
    noticesTop: 330,
    visibleSlots: 9,
    channelsTop: 150,
    closingTop: 180,
  },
  square: {
    width: 1080,
    height: 1080,
    boxTop: 0,
    boxHeight: 1080,
    device: { left: 240, top: 210, width: 600, height: 840, scale: 1.5 },
    crop: true,
    titleTop: 36,
    clockTop: 150,
    noticesTop: 300,
    visibleSlots: 7,
    channelsTop: 118,
    closingTop: 130,
  },
};

function stageCss(layout: Layout) {
  const { device } = layout;
  const frame = { width: device.width / device.scale, height: device.height / device.scale };
  return `
  html, body { margin: 0; width: ${layout.width}px; height: ${layout.height}px; overflow: hidden; background: #0a1521; color: #eaeadc; font-family: "Inter Variable", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  * { box-sizing: border-box; }
  .light { position: absolute; left: 0; top: 0; width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border-radius: 50%; background: radial-gradient(circle, rgba(143, 193, 238, 0.2), rgba(143, 193, 238, 0.05) 38%, transparent 62%); }
  .grain { position: absolute; inset: 0; opacity: 0.07; mix-blend-mode: soft-light; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .square { position: absolute; left: 0; top: ${layout.boxTop}px; width: ${layout.width}px; height: ${layout.boxHeight}px; }
  .problem, .turn, .flash, .closing, .device-halo, .light, .grain, .arrival, .channels, .stream { pointer-events: none; }
  .lines { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
  .line { position: absolute; left: 50%; width: 980px; margin: 0; transform: translateX(-50%); text-align: center; font-weight: 800; letter-spacing: -0.035em; text-wrap: balance; }
  .line-hero { top: 50%; translate: 0 -50%; font-size: 96px; line-height: 1.02; }
  .line-title { top: ${layout.titleTop}px; font-size: 60px; line-height: 1.1; }
  .line-kicker { display: block; margin-bottom: 14px; font-size: 20px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; color: #8fc1ee; }
  .word { display: inline-block; overflow: hidden; padding: 0.08em 0.04em 0.16em; margin: -0.08em -0.04em -0.16em; vertical-align: top; }
  .word-inner { display: inline-block; }
  .accent { color: #8fc1ee; }
  .problem { position: absolute; inset: 0; }
  .clock { position: absolute; left: 0; right: 0; top: ${layout.clockTop}px; text-align: center; font-size: 104px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; font-variant-numeric: tabular-nums; color: #eaeadc; }
  .clock small { display: block; margin-top: 10px; font-size: 20px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #8fc1ee; }
  .clock small[data-tone="green"] { color: #5fd3a0; }
  .notices { position: absolute; left: 50%; top: ${layout.noticesTop}px; width: 580px; height: ${layout.visibleSlots * 94}px; margin-left: -290px; }
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
  .notice-state[data-tone="blue"] { background: rgba(143, 193, 238, 0.16); color: #8fc1ee; }
  .turn { position: absolute; inset: 0; z-index: 6; display: grid; place-items: center; }
  .turn-logo { position: absolute; width: 250px; height: 300px; color: #eaeadc; filter: drop-shadow(0 0 28px rgba(143, 193, 238, 0.45)); }
  .turn-logo svg { width: 100%; height: 100%; }
  .burst { position: absolute; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(143, 193, 238, 0.75), rgba(143, 193, 238, 0.18) 35%, transparent 65%); }
  .flash { position: absolute; z-index: 6; inset: -${layout.boxTop}px 0 -${layout.height - layout.boxTop - layout.boxHeight}px; background: #cfe3f6; }
  .device { position: absolute; left: ${device.left}px; top: ${device.top}px; width: ${device.width}px; height: ${device.height}px; overflow: hidden; border-radius: 38px; background: #0f1d2c; box-shadow: 0 0 0 1px rgba(143, 193, 238, 0.22), 0 50px 140px rgba(0, 0, 0, 0.62); }
  .device iframe { display: block; width: ${frame.width}px; height: ${frame.height}px; border: 0; transform: scale(${device.scale}); transform-origin: 0 0; }
  .device-edge { position: absolute; inset: 0; z-index: 3; border-radius: 38px; padding: 2px; background: conic-gradient(from var(--angle, 0deg), rgba(143, 193, 238, 0) 0deg, rgba(143, 193, 238, 0.95) 70deg, rgba(95, 211, 160, 0.7) 110deg, rgba(143, 193, 238, 0) 180deg, rgba(143, 193, 238, 0) 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; opacity: 0.9; }
  .focus-ring { position: absolute; z-index: 2; border-radius: 16px; box-shadow: 0 0 0 2px rgba(143, 193, 238, 0.95), 0 0 30px rgba(143, 193, 238, 0.4), 0 0 0 2000px rgba(5, 10, 18, 0.5); opacity: 0; }
  .device-halo { position: absolute; left: ${device.left - 60}px; top: ${device.top + 40}px; width: ${device.width + 120}px; height: ${device.height}px; border-radius: 50%; background: radial-gradient(closest-side, rgba(143, 193, 238, 0.2), transparent); filter: blur(50px); }
  .device-halo-green { background: radial-gradient(closest-side, rgba(95, 211, 160, 0.42), transparent); }
  .arrival { position: absolute; left: ${device.left + 10}px; top: ${device.top + 26}px; z-index: 4; }
  .arrival .notice { width: ${device.width - 20}px; border-color: rgba(143, 193, 238, 0.4); background: rgba(22, 40, 60, 0.98); box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6); }
  .channels { position: absolute; left: 0; right: 0; top: ${layout.channelsTop}px; z-index: 5; display: flex; justify-content: center; gap: 18px; }
  .channel { display: grid; place-items: center; width: 58px; height: 58px; border: 1px solid rgba(143, 193, 238, 0.3); border-radius: 50%; background: rgba(16, 30, 46, 0.95); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45); }
  .channel svg { width: 29px; height: 29px; }
  .stream { position: absolute; left: ${device.left + 10}px; top: ${device.top - 10}px; width: ${device.width - 20}px; height: ${device.height + 20}px; overflow: hidden; }
  .stream .notice { width: ${device.width - 20}px; }
  .stream::before, .stream::after { content: ""; position: absolute; left: 0; right: 0; z-index: 2; height: 130px; pointer-events: none; }
  .stream::before { top: 0; background: linear-gradient(#0a1521, rgba(10, 21, 33, 0)); }
  .stream::after { bottom: 0; background: linear-gradient(rgba(10, 21, 33, 0), #0a1521); }
  .chips { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
  .chip { position: absolute; display: inline-flex; align-items: center; gap: 12px; padding: 14px 24px 14px 18px; border: 1px solid; border-radius: 999px; background: rgba(10, 21, 33, 0.94); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); font-size: 25px; font-weight: 700; letter-spacing: -0.01em; white-space: nowrap; }
  .chip::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: currentColor; box-shadow: 0 0 14px currentColor; }
  .chip[data-tone="green"] { color: #5fd3a0; border-color: rgba(95, 211, 160, 0.5); }
  .chip[data-tone="blue"] { color: #8fc1ee; border-color: rgba(143, 193, 238, 0.5); }
  .chip[data-tone="amber"] { color: #f2c14e; border-color: rgba(242, 193, 78, 0.5); }
  .closing { position: absolute; inset: 0; z-index: 7; display: grid; justify-items: center; align-content: start; padding-top: ${layout.closingTop}px; text-align: center; }
  .closing-ring { position: absolute; left: 50%; top: ${layout.closingTop + 120}px; width: 520px; height: 520px; margin-left: -260px; border-radius: 50%; background: radial-gradient(circle, rgba(143, 193, 238, 0.22), rgba(143, 193, 238, 0.04) 45%, transparent 70%); }
  .closing-logo { position: relative; width: 190px; height: 228px; color: #eaeadc; filter: drop-shadow(0 0 24px rgba(143, 193, 238, 0.4)); }
  .closing-logo svg { width: 100%; height: 100%; }
  .closing-word { position: relative; margin-top: 26px; font-size: 74px; font-weight: 400; letter-spacing: 0.08em; line-height: 1; }
  .closing-word b { font-weight: 800; }
  .closing-line { position: relative; left: auto; margin: 50px 0 0; width: 900px; font-size: 66px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.08; text-wrap: balance; }
  .closing-cta { position: relative; margin-top: 52px; padding: 24px 52px; border-radius: 999px; background: #eaeadc; color: #0a1521; font-size: 32px; font-weight: 800; letter-spacing: -0.01em; box-shadow: 0 18px 60px rgba(234, 234, 220, 0.24); }
  .closing-url { position: relative; margin-top: 28px; font-size: 32px; font-weight: 600; color: #b8c4d3; letter-spacing: -0.01em; }
  .closing-channels { position: relative; display: flex; gap: 14px; margin-top: 34px; }
  .closing-channels .channel { width: 54px; height: 54px; }
  .closing-channels .channel svg { width: 27px; height: 27px; }
  .closing-note { position: relative; margin-top: 30px; font-size: 20px; color: #5f6d80; }
`;
}

const frameCss = `
  .sidebar { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; scrollbar-width: none; }
  *::-webkit-scrollbar { display: none; }
  .typing { display: inline-flex; gap: 5px; align-items: center; padding: 6px 2px; }
  .typing i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
`;

export function uniqueIds(markup: string, key: string) {
  return markup.replace(/id="([^"]+)"/g, `id="$1-${key}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${key})`);
}

function device(layer: Layer) {
  return `<div class="device" data-layer="${layer}"><iframe title="BoxLead ${layer}"></iframe><div class="focus-ring"></div><div class="device-edge"></div></div>`;
}

export function stageHtml(assets: Assets, layout: Layout) {
  const channels = (where: string) =>
    (["whatsapp", "instagram", "messenger", "meli"] as Platform[])
      .map((platform) => `<span class="channel">${uniqueIds(assets.icons[platform], `${where}-${platform}`)}</span>`)
      .join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>BoxLead promo</title>
<link rel="stylesheet" href="/node_modules/@fontsource-variable/inter/index.css">
<style>${stageCss(layout)}</style></head><body>
<div class="light"></div><div class="grain"></div>
<section class="square">
  <div class="problem"><div class="clock"><span class="clock-value">03:00</span><small>Sin responder</small></div><div class="notices"></div></div>
  <div class="turn"><div class="burst"></div><div class="turn-logo">${assets.logo}</div></div>
  <div class="flash"></div>
  <div class="device-halo"></div>
  <div class="device-halo device-halo-green"></div>
  ${device("a")}
  ${device("b")}
  <div class="arrival"></div>
  <div class="channels">${channels("row")}</div>
  <div class="stream"></div>
  <div class="lines"></div>
  <div class="chips"></div>
  <div class="closing"><div class="closing-ring"></div><div class="closing-logo">${assets.logo}</div><div class="closing-word"><b>BOX</b>LEAD</div><p class="closing-line line"></p><div class="closing-cta">Sumate a la beta</div><div class="closing-url">boxlead.app</div><div class="closing-channels">${channels("closing")}</div><div class="closing-note">Datos de ejemplo</div></div>
</section>
<script>window.promoAssets = ${JSON.stringify(assets)}; window.promoFrameCss = ${JSON.stringify(frameCss)}; window.promoLayout = ${JSON.stringify(layout)};</script>
<script>(${stageRuntime.toString()})();</script>
</body></html>`;
}

export function stageRuntime() {
  const { promoAssets: assets, promoFrameCss, promoLayout: layout } = window as unknown as {
    promoAssets: Assets;
    promoFrameCss: string;
    promoLayout: Layout;
  };
  const DEVICE_SCALE = layout.device.scale;
  const DEVICE_W = layout.device.width;
  const DEVICE_H = layout.device.height;
  const FRAME_W = DEVICE_W / DEVICE_SCALE;
  const FRAME_H = DEVICE_H / DEVICE_SCALE;
  let iconCount = 0;
  const icon = (platform: Platform) => {
    iconCount += 1;
    return assets.icons[platform].replace(/id="([^"]+)"/g, `id="$1-r${iconCount}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-r${iconCount})`);
  };
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const prog = (t: number, start: number, duration: number) => clamp((t - start) / duration);
  const outCubic = (p: number) => 1 - (1 - p) ** 3;
  const inOutCubic = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
  const outBack = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
  const bump = (t: number, at: number, width: number) => Math.exp(-(((t - at) / width) ** 2));
  const seeded = (index: number, salt: number) => {
    const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const query = <T extends Element>(selector: string) => document.querySelector(selector) as T;
  const style = (element: HTMLElement | SVGElement, values: Record<string, string>) => {
    for (const [key, value] of Object.entries(values)) element.style.setProperty(key, value);
  };

  type Framing = { s: number; tx: number; ty: number };
  let script: Script;
  const lineElements: HTMLElement[] = [];
  const chipElements: HTMLElement[] = [];
  const noticeElements: HTMLElement[] = [];
  const streamElements: HTMLElement[] = [];
  const devices = {
    a: query<HTMLElement>('.device[data-layer="a"]'),
    b: query<HTMLElement>('.device[data-layer="b"]'),
  };
  const frames = { a: devices.a.querySelector("iframe")!, b: devices.b.querySelector("iframe")! };
  const framing: Record<Layer, Framing> = { a: { s: DEVICE_SCALE, tx: 0, ty: 0 }, b: { s: DEVICE_SCALE, tx: 0, ty: 0 } };
  const framingCache = new Map<number, Framing>();
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

  function noticeMarkup(notice: Notice, time: string, state: string, tone: Tone) {
    return `<span class="notice-icon">${icon(notice.platform)}</span><span class="notice-body"><span class="notice-top"><span class="notice-name"></span><span class="notice-time">${time}</span></span><span class="notice-text"></span></span><span class="notice-state" data-tone="${tone}">${state}</span>`;
  }

  function fillNotice(element: HTMLElement, notice: Notice) {
    element.querySelector<HTMLElement>(".notice-name")!.textContent = notice.name;
    element.querySelector<HTMLElement>(".notice-text")!.textContent = notice.text;
  }

  function words(target: HTMLElement, text: string, kicker?: string) {
    target.innerHTML = "";
    if (kicker) {
      const label = document.createElement("span");
      label.className = "line-kicker";
      label.textContent = kicker;
      target.append(label);
    }
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
    const kicker = target.querySelector<HTMLElement>(".line-kicker");
    if (kicker) {
      const p = outCubic(prog(t, start, 0.4));
      style(kicker, { opacity: String(p), transform: `translateY(${(1 - p) * 10}px)`, "letter-spacing": `${0.24 + (1 - p) * 0.2}em` });
    }
    const leave = outCubic(prog(t, end - 0.3, 0.3));
    target.style.opacity = String(1 - leave);
    target.style.transform = `translateX(-50%) translateY(${-leave * 22}px)`;
  }

  function formatClock(minutes: number) {
    const hours = Math.floor(minutes / 60) % 24;
    const rest = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} h`;
    return "+1 día";
  }

  function gaugeAt(t: number) {
    const { gauge, at } = script.problem;
    return gauge.from + (gauge.to - gauge.from) * inOutCubic(prog(t, at, gauge.until - at));
  }

  function formatGauge(minutes: number) {
    return script.problem.gauge.kind === "clock" ? formatClock(minutes) : formatDuration(minutes);
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
    const solved = t >= tidyAt + 0.12;
    query<HTMLElement>(".clock-value").textContent = solved && script.problem.doneValue ? script.problem.doneValue : formatGauge(gaugeAt(t));
    const label = query<HTMLElement>(".clock small");
    label.textContent = solved ? script.problem.doneLabel : script.problem.label;
    label.dataset.tone = solved ? "green" : "";
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
      const fade = slot >= layout.visibleSlots - 1 ? 1 - Math.min(1, slot - layout.visibleSlots + 2) : 1;
      style(element, {
        transform: `translate(${shift}px, ${y}px) rotate(${rotate}deg) scale(${0.9 + 0.1 * enter})`,
        opacity: String(enter * (0.45 + 0.55 * fade)),
      });
      const state = element.querySelector<HTMLElement>(".notice-state")!;
      const done = t >= tidyAt + 0.12 + index * 0.05;
      state.dataset.tone = done ? "green" : "amber";
      state.textContent = done ? "Respondido" : "Sin responder";
      element.querySelector<HTMLElement>(".notice-time")!.textContent = element.dataset.time || formatGauge(gaugeAt(arrival));
    });
  }

  const logoLengths = new Map<HTMLElement, number[]>();
  function drawLogo(root: HTMLElement, p: number) {
    const paths = root.querySelectorAll<SVGPathElement>("path");
    let lengths = logoLengths.get(root);
    if (!lengths) {
      lengths = Array.from(paths, (path) => path.getTotalLength());
      logoLengths.set(root, lengths);
    }
    paths.forEach((path, index) => {
      const length = lengths[index];
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

  function focusRect(layer: Layer, selector: string) {
    const target = docOf(layer)?.querySelector(selector);
    return target ? target.getBoundingClientRect() : null;
  }

  function framingFor(index: number, shot: Shot): Framing {
    const cached = framingCache.get(index);
    if (cached) return cached;
    const base = { s: DEVICE_SCALE, tx: 0, ty: 0 };
    const focus = shot.focus;
    if (!focus || focus.align === "keep" || !layout.crop) return base;
    const rect = focusRect(shot.layer, focus.selector);
    if (!rect) return base;
    const s = focus.zoom ?? DEVICE_SCALE;
    const centerX = DEVICE_W / 2 - s * (rect.left + rect.width / 2);
    const centerY = focus.align === "top" ? 120 - s * rect.top : DEVICE_H / 2 - s * (rect.top + rect.height / 2);
    const result = {
      s,
      tx: Math.min(0, Math.max(DEVICE_W - s * FRAME_W, centerX)),
      ty: Math.min(0, Math.max(DEVICE_H - s * FRAME_H, centerY)),
    };
    framingCache.set(index, result);
    return result;
  }

  function applyFraming(layer: Layer, next: Framing) {
    framing[layer] = next;
    frames[layer].style.transform = `translate(${next.tx}px, ${next.ty}px) scale(${next.s})`;
  }

  function renderRing(layer: Layer, shot: Shot | null, t: number) {
    const ring = devices[layer].querySelector<HTMLElement>(".focus-ring")!;
    const focus = shot?.focus;
    if (!shot || !focus || !focus.ring) {
      ring.style.opacity = "0";
      return;
    }
    const rect = focusRect(layer, focus.selector);
    if (!rect) {
      ring.style.opacity = "0";
      return;
    }
    const { s, tx, ty } = framing[layer];
    const pad = 10;
    const show = outCubic(prog(t, shot.at + 0.4, 0.35));
    const hide = shot.until - t < 0.25 ? 0 : 1;
    style(ring, {
      left: `${tx + s * rect.left - pad}px`,
      top: `${ty + s * rect.top - pad}px`,
      width: `${s * rect.width + pad * 2}px`,
      height: `${s * rect.height + pad * 2}px`,
      opacity: String(show * hide),
    });
  }

  function renderDevices(t: number) {
    const index = script.shots.findIndex((shot, position) => t >= shot.at && (position === script.shots.length - 1 || t < script.shots[position + 1].at));
    const current = index >= 0 ? script.shots[index] : null;
    const previous = index > 0 ? script.shots[index - 1] : null;
    query<HTMLElement>(".square").style.setProperty("--angle", `${(t * 50) % 360}deg`);
    for (const layer of ["a", "b"] as Layer[]) {
      const device = devices[layer];
      let opacity = 0;
      let clip = "none";
      let shift = 0;
      let shot: Shot | null = null;
      if (current && layer === current.layer && t < current.until) {
        shot = current;
        applyFraming(layer, framingFor(index, current));
        const p = current.enter === "cut" ? 1 : outCubic(prog(t, current.at, 0.5));
        opacity = current.enter === "slide" ? p : 1;
        clip = clipFor(current.enter, p);
        shift = current.enter === "slide" ? (1 - p) * 50 : 0;
      } else if (current && previous && layer === previous.layer && layer !== current.layer && t < current.at + 0.5) {
        shot = previous;
        opacity = 1;
      }
      if (current && t >= current.until && layer === current.layer) {
        const leave = outCubic(prog(t, current.until, 0.45));
        opacity = 1 - leave;
        shift = leave * 60;
      }
      style(device, { opacity: String(opacity), "clip-path": clip, transform: `translateY(${shift}px)`, "z-index": current && layer === current.layer ? "2" : "1" });
      renderRing(layer, shot, t);
    }
    const active = current ? (t < current.until ? 1 : 1 - outCubic(prog(t, current.until, 0.45))) : 0;
    const base = active * (current ? outCubic(prog(t, current.at, 0.6)) : 0);
    let blue = 0;
    let green = 0;
    for (const pulse of script.pulses) {
      const amount = bump(t, pulse.at, pulse.tone === "green" ? 0.35 : 0.2);
      if (pulse.tone === "green") green += amount;
      else blue += amount;
    }
    for (const shot of script.shots) blue += 0.6 * bump(t, shot.at + 0.1, 0.18);
    query<HTMLElement>(".device-halo:not(.device-halo-green)").style.opacity = String(Math.min(1, base * (1 + blue)));
    query<HTMLElement>(".device-halo-green").style.opacity = String(Math.min(1, green));
  }

  function renderEffects(t: number) {
    for (const effect of script.effects) {
      const doc = docOf(effect.layer);
      if (!doc) continue;
      if (effect.kind === "reveal") {
        const target = doc.querySelector<HTMLElement>(effect.selector);
        if (!target) continue;
        const p = outBack(prog(t, effect.at, 0.45));
        target.style.display = t >= effect.at ? "" : "none";
        style(target, { opacity: String(Math.min(1, p)), transform: `translateY(${(1 - p) * 16}px) scale(${0.92 + 0.08 * p})`, "transform-origin": "0 0" });
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
    }
  }

  function anchorPoint(anchor: Anchor) {
    const rect = focusRect(anchor.layer, anchor.selector);
    if (!rect) return null;
    const device = devices[anchor.layer].getBoundingClientRect();
    const square = query<HTMLElement>(".square").getBoundingClientRect();
    const { s, tx, ty } = framing[anchor.layer];
    return {
      x: device.left - square.left + tx + s * rect.right + anchor.dx,
      y: device.top - square.top + ty + s * rect.top + anchor.dy,
    };
  }

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
      const x = Math.min(Math.max(point.x, 300), 1040);
      style(element, {
        left: `${x}px`,
        top: `${point.y}px`,
        transform: `translate(-100%, -50%) scale(${0.6 + 0.4 * enter}) translateY(${leave * 10}px)`,
        opacity: String(Math.min(enter, 1) * (1 - leave)),
      });
    });
  }

  function renderArrival(t: number) {
    const { at, until } = script.arrival;
    const arrival = query<HTMLElement>(".arrival");
    const visible = t >= at && t < until;
    arrival.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    const enter = outBack(prog(t, at, 0.55));
    const leave = outCubic(prog(t, until - 0.35, 0.35));
    style(arrival, {
      transform: `translateY(${(1 - enter) * -70 - leave * 40}px) scale(${0.94 + 0.06 * enter})`,
      opacity: String(Math.min(1, enter) * (1 - leave)),
    });
  }

  function renderChannels(t: number) {
    const { at, until } = script.channels;
    const row = query<HTMLElement>(".channels");
    const visible = t >= at && t < until;
    row.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    const leave = outCubic(prog(t, until - 0.3, 0.3));
    row.querySelectorAll<HTMLElement>(".channel").forEach((channel, index) => {
      const p = outBack(prog(t, at + index * 0.1, 0.5));
      style(channel, { transform: `translateY(${(1 - p) * 30}px) scale(${0.6 + 0.4 * p})`, opacity: String(Math.min(1, p) * (1 - leave)) });
    });
  }

  function renderStream(t: number) {
    const { at, until } = script.stream;
    const stream = query<HTMLElement>(".stream");
    const visible = t >= at && t < until;
    stream.style.display = visible ? "" : "none";
    if (!visible) return;
    const local = t - at;
    const offset = 260 * local + 42 * local ** 3;
    const leave = outCubic(prog(t, until - 0.4, 0.4));
    stream.style.opacity = String(1 - leave);
    streamElements.forEach((element, index) => {
      const y = DEVICE_H + 40 + index * 96 - offset;
      const shown = y > -120 && y < DEVICE_H + 140;
      element.style.visibility = shown ? "visible" : "hidden";
      if (shown) element.style.transform = `translateY(${y}px)`;
    });
  }

  function renderClosing(t: number) {
    const { at } = script.closing;
    const closing = query<HTMLElement>(".closing");
    const visible = t >= at;
    closing.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    drawLogo(closing.querySelector<HTMLElement>(".closing-logo")!, inOutCubic(prog(t, at + 0.1, 0.9)));
    const ringP = outCubic(prog(t, at, 1.4));
    style(query<HTMLElement>(".closing-ring"), { opacity: String(ringP * (0.8 + 0.2 * Math.sin((t - at) * 1.6))), transform: `scale(${0.6 + 0.4 * ringP})` });
    const rise = (selector: string, start: number, extra: Record<string, string> = {}) => {
      const p = outCubic(prog(t, start, 0.6));
      style(query<HTMLElement>(selector), { opacity: String(p), transform: `translateY(${(1 - p) * 26}px)`, ...extra });
      return p;
    };
    const wordP = rise(".closing-word", at + 0.55);
    query<HTMLElement>(".closing-word").style.letterSpacing = `${0.08 + (1 - wordP) * 0.3}em`;
    const line = closing.querySelector<HTMLElement>(".closing-line")!;
    animateWords(line, t, at + 1.0, Number.POSITIVE_INFINITY, false);
    line.style.transform = "none";
    const cta = query<HTMLElement>(".closing-cta");
    const pop = outBack(prog(t, at + 2.0, 0.55));
    const breathe = t > at + 2.6 ? 1 + 0.02 * Math.sin((t - at) * 2.4) : 1;
    style(cta, { opacity: String(Math.min(1, pop)), transform: `scale(${(0.7 + 0.3 * pop) * breathe})`, "box-shadow": `0 18px 60px rgba(234, 234, 220, ${0.18 + 0.1 * Math.sin((t - at) * 2.4)})` });
    rise(".closing-url", at + 2.35);
    query<HTMLElement>(".closing-channels").style.opacity = "1";
    closing.querySelectorAll<HTMLElement>(".closing-channels .channel").forEach((channel, index) => {
      const p = outBack(prog(t, at + 2.6 + index * 0.08, 0.5));
      style(channel, { opacity: String(Math.min(1, p)), transform: `translateY(${(1 - p) * 20}px) scale(${0.6 + 0.4 * p})` });
    });
    rise(".closing-note", at + 3.0);
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
      framingCache.clear();
      const lines = query<HTMLElement>(".lines");
      lines.innerHTML = "";
      lineElements.length = 0;
      for (const line of script.lines) {
        const element = document.createElement("p");
        element.className = `line line-${line.kind}`;
        words(element, line.text, line.kicker);
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
        element.innerHTML = noticeMarkup(notice, "", "Sin responder", "amber");
        element.dataset.time = notice.time ?? "";
        fillNotice(element, notice);
        notices.prepend(element);
        noticeElements.push(element);
      }
      const arrival = query<HTMLElement>(".arrival");
      arrival.innerHTML = `<div class="notice">${noticeMarkup(script.arrival.notice, script.arrival.time, "Nuevo", "blue")}</div>`;
      fillNotice(arrival.querySelector<HTMLElement>(".notice")!, script.arrival.notice);
      const stream = query<HTMLElement>(".stream");
      stream.innerHTML = "";
      streamElements.length = 0;
      script.stream.items.forEach((item) => {
        const element = document.createElement("div");
        element.className = "notice";
        element.innerHTML = noticeMarkup({ platform: item.platform, name: item.name, text: "" }, "", item.state, item.state === "Lead creado" ? "blue" : "green");
        fillNotice(element, { platform: item.platform, name: item.name, text: item.state === "Calificado" ? "Listo para comprar" : item.state === "Lead creado" ? "Sumado a tu pipeline" : "Atendido por tu agente" });
        stream.append(element);
        streamElements.push(element);
      });
      words(query<HTMLElement>(".closing-line"), "*Nunca* *más* un mensaje sin responder.");
    },
    render(t) {
      renderLight(t);
      script.lines.forEach((line, index) => animateWords(lineElements[index], t, line.at, line.until, Boolean(line.fast)));
      renderProblem(t);
      renderTurn(t);
      renderDevices(t);
      renderEffects(t);
      renderArrival(t);
      renderChannels(t);
      renderStream(t);
      renderChips(t);
      renderClosing(t);
    },
  };
}
