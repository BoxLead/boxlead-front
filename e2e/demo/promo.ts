import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type FrameLocator, type Page } from "playwright";
import { stageHtml, type Assets, type Chip, type Layer, type Line, type Notice, type Script, type Shot } from "./stage.ts";

const APP = process.env.DEMO_APP_URL ?? "http://localhost:5173";
const API = process.env.DEMO_API_URL ?? "http://localhost:8090";
const OUT = resolve(process.env.PROMO_OUT ?? "promo-video");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const FPS = 30;
const DURATION = 40;
const TOTAL_FRAMES = FPS * DURATION;
const MAX_LOAD_PER_CORE = 0.75;
const POSTER_AT = 12.4;
const STILLS = [1.1, 5.6, 8.0, 10.4, 12.4, 15.0, 18.2, 20.0, 21.6, 23.1, 24.6, 26.1, 28.2, 31.6, 38.5];
const HEADERS = { "X-Requested-With": "boxlead-web" };
const HERO_PAIRS: Array<[RegExp, RegExp]> = [
  [/otro color/i, /negro y en azul/i],
  [/equipar un local/i, /precio por cantidad/i],
  [/precio tiene en efectivo/i, /transferencia/i],
];
const PREVIEW = process.env.PROMO_TIMES?.split(",").map(Number) ?? null;

const lines: Line[] = [
  { at: 0.15, until: 1.95, text: "Tu cliente escribe a las *3* *AM.*", kind: "hero" },
  { at: 2.15, until: 4.5, text: "Vos, durmiendo.", kind: "title" },
  { at: 4.7, until: 6.95, text: "Ya le compró a otro.", kind: "title" },
  { at: 9.45, until: 12.95, text: "Tu agente ya le respondió.", kind: "title" },
  { at: 13.1, until: 16.85, text: "En automático, las 24 horas.", kind: "title" },
  { at: 17.15, until: 18.9, text: "Todos tus canales, una bandeja.", kind: "title", fast: true },
  { at: 19.15, until: 20.4, text: "Responde y califica a cada cliente.", kind: "title", fast: true },
  { at: 20.65, until: 21.9, text: "Te deja el borrador listo.", kind: "title", fast: true },
  { at: 22.15, until: 23.4, text: "¿Hace falta una persona? Te avisa.", kind: "title", fast: true },
  { at: 23.65, until: 24.9, text: "Responde comentarios de Instagram.", kind: "title", fast: true },
  { at: 25.15, until: 26.4, text: "Tu agente, con tus reglas.", kind: "title", fast: true },
  { at: 26.65, until: 28.9, text: "Sabé qué canal vende más.", kind: "title", fast: true },
  { at: 29.4, until: 33.75, text: "Más ventas con el *mismo* *equipo.*", kind: "title" },
];

const shots: Shot[] = [
  { at: 9, until: 17, layer: "a", enter: "wipe-up" },
  { at: 17, until: 19, layer: "b", enter: "wipe-right" },
  { at: 19, until: 20.5, layer: "a", enter: "wipe-up" },
  { at: 20.5, until: 22, layer: "b", enter: "wipe-left" },
  { at: 22, until: 23.5, layer: "a", enter: "wipe-up" },
  { at: 23.5, until: 25, layer: "b", enter: "wipe-right" },
  { at: 25, until: 26.5, layer: "a", enter: "wipe-up" },
  { at: 26.5, until: 29, layer: "b", enter: "wipe-left" },
  { at: 29, until: 34, layer: "a", enter: "slide" },
];

const chips: Chip[] = [
  { at: 11.55, until: 16.75, text: "Respondido solo", tone: "green", anchor: { layer: "a", selector: "[data-promo-reply]", dx: -4, dy: -24 } },
  { at: 29.5, until: 33.8, text: "Calificado", tone: "green", x: 310, y: 330 },
  { at: 30.3, until: 33.8, text: "Lead creado", tone: "blue", x: 1010, y: 520 },
  { at: 31.1, until: 33.8, text: "Respondido", tone: "green", x: 340, y: 700 },
  { at: 31.9, until: 33.8, text: "Calificado", tone: "green", x: 1020, y: 880 },
  { at: 32.7, until: 33.8, text: "Lead creado", tone: "blue", x: 360, y: 1000 },
];

const notices: Notice[] = [
  { platform: "whatsapp", name: "Carla Méndez", text: "¿Hay stock en negro? ¿Envían a Córdoba?" },
  { platform: "instagram", name: "tomas.rios", text: "¿Precio? ¿Tienen cuotas?" },
  { platform: "meli", name: "Pregunta nueva", text: "Buenas, ¿hacen factura A?" },
  { platform: "messenger", name: "Lucía Pereyra", text: "¿Hacen envíos a Mendoza?" },
  { platform: "whatsapp", name: "Nico Álvarez", text: "¿Sigue disponible?" },
  { platform: "instagram", name: "sofi.ok", text: "¿Cuánto sale el combo?" },
  { platform: "meli", name: "Pregunta nueva", text: "¿Tiene garantía oficial?" },
  { platform: "whatsapp", name: "Romina G.", text: "Hola, ¿están?" },
];

const script: Script = {
  lines,
  shots,
  chips,
  notices,
  effects: [
    { kind: "pin-bottom", layer: "a", at: 8.5, until: 17 },
    { kind: "typing", layer: "a", at: 9.6, until: 11.0 },
    { kind: "reveal", layer: "a", selector: "[data-promo-reply]", at: 11.0 },
    { kind: "scroll", layer: "a", selector: ".layout-content", at: 29.2, until: 34, from: 420, to: 6400 },
  ],
  problem: { at: 2, until: 9, tidyAt: 8.35, clockFrom: 180, clockTo: 460, clockUntil: 4.6 },
  turn: { at: 7, until: 9 },
  closing: { at: 34 },
};

type Conversation = { id: string; leadName: string | null; platform: string };
type Message = { direction: "INBOUND" | "OUTBOUND"; content: string | null; agentName: string | null };
type Step = { at: number; run: () => Promise<void> };

function checkLoad() {
  const load = Number(readFileSync("/proc/loadavg", "utf8").split(" ")[0]);
  const cores = cpus().length;
  console.log(`promo: load ${load.toFixed(2)} on ${cores} cores`);
  if (load > cores * MAX_LOAD_PER_CORE && !process.env.PROMO_FORCE) {
    throw new Error("promo: the machine is busy, wait for the load to drop or set PROMO_FORCE=1");
  }
}

async function reset() {
  const response = await fetch(`${API}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...HEADERS },
    body: JSON.stringify({ scenario: "showcase" }),
  });
  if (!response.ok) throw new Error(`promo: could not load the showcase scenario (${response.status})`);
}

async function login(page: Page) {
  await page.goto(`${APP}/login`);
  await page.locator('input[name="email"]').fill("demo@boxlead.app");
  await page.locator('input[name="password"]').fill("demo1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/app/inbox");
}

async function collectAssets(page: Page): Promise<Assets> {
  await page.goto(APP);
  await page.locator('li[title="MercadoLibre"] svg').waitFor();
  return page.evaluate(() => {
    const markup = (selector: string) => document.querySelector(selector)!.outerHTML;
    return {
      logo: markup(".brand-logo-mark"),
      icons: {
        whatsapp: markup('li[title="WhatsApp"] svg'),
        instagram: markup('li[title="Instagram"] svg'),
        messenger: markup('li[title="Messenger"] svg'),
        meli: markup('li[title="MercadoLibre"] svg'),
      },
    };
  });
}

async function api<T>(context: BrowserContext, path: string): Promise<T> {
  const response = await context.request.get(`${API}${path}`, { headers: HEADERS });
  return (await response.json()) as T;
}

async function conversations(context: BrowserContext) {
  const list = await api<Conversation[]>(context, "/conversations");
  const byName = (name: string) => {
    const found = list.find((chat) => chat.leadName === name);
    if (!found) throw new Error(`promo: no conversation with ${name}`);
    return found.id;
  };
  let hero: string | null = null;
  for (const chat of list.filter((item) => item.platform === "WHATSAPP").slice(0, 150)) {
    const messages = await api<Message[]>(context, `/conversations/${chat.id}/messages`);
    const [question, reply] = messages;
    const fits =
      messages.length === 2 &&
      question.direction === "INBOUND" &&
      reply.direction === "OUTBOUND" &&
      reply.agentName &&
      HERO_PAIRS.some(([asked, answered]) => asked.test(question.content ?? "") && answered.test(reply.content ?? ""));
    if (fits) {
      hero = chat.id;
      break;
    }
  }
  if (!hero) throw new Error("promo: no WhatsApp conversation fits the hero scene");
  return { hero, valentina: byName("Valentina Ruiz"), martu: byName("martu.home"), flor: byName("flor.deco") };
}

class Stage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  frame(layer: Layer): FrameLocator {
    return this.page.frameLocator(`.device[data-layer="${layer}"] iframe`);
  }

  async open(layer: Layer, path: string) {
    await this.page.evaluate(
      ([selector, src]) => {
        (document.querySelector(selector) as HTMLIFrameElement).src = src;
      },
      [`.device[data-layer="${layer}"] iframe`, `${APP}${path}`],
    );
    await this.frame(layer).locator(".layout-content").waitFor();
  }

  async conversation(layer: Layer, id: string) {
    await this.open(layer, `/app/inbox?id=${id}`);
    const frame = this.frame(layer);
    await frame.getByRole("region", { name: /Conversación con/ }).waitFor();
    await frame.locator(".bubble, .comment-event").first().waitFor();
    await this.page.waitForTimeout(250);
  }

  async scrollTo(layer: Layer, selector: string, offset = 0) {
    await this.frame(layer)
      .locator(selector)
      .first()
      .evaluate((element, shift) => {
        const scroller = element.closest(".layout-content") as HTMLElement;
        const top = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollTop += top - shift;
      }, offset);
  }
}

function steps(stage: Stage, ids: Awaited<ReturnType<typeof conversations>>): Step[] {
  const { page } = stage;
  return [
    {
      at: 0,
      run: async () => {
        await stage.conversation("a", ids.hero);
        await stage
          .frame("a")
          .locator(".bubble-outbound")
          .last()
          .evaluate((bubble) => {
            bubble.setAttribute("data-promo-reply", "");
            const times = Array.from(bubble.closest(".chat-thread")!.querySelectorAll(".bubble-time")).slice(-2);
            times.forEach((time, index) => (time.textContent = index === 0 ? "03:01" : "03:02"));
          });
      },
    },
    {
      at: 12,
      run: async () => {
        await stage.open("b", "/app/inbox");
        await stage.frame("b").getByRole("link", { name: /LUCASRIVERO_77/ }).waitFor();
      },
    },
    {
      at: 17.2,
      run: async () => {
        await stage.open("a", "/app/leads");
        const frame = stage.frame("a");
        await frame.getByRole("button", { name: /Calificado/ }).dispatchEvent("click");
        await frame.locator(".leads-row").first().waitFor();
        await stage.scrollTo("a", ".leads-table-wrap", 24);
      },
    },
    { at: 19.2, run: () => stage.conversation("b", ids.valentina) },
    { at: 20.7, run: () => stage.conversation("a", ids.martu) },
    {
      at: 22.2,
      run: async () => {
        await stage.conversation("b", ids.flor);
        const frame = stage.frame("b");
        const comment = frame.locator(".comment-event").first();
        await comment.getByRole("button", { name: "Responder en público" }).dispatchEvent("click");
        await frame.getByLabel("Responder en público a flor.deco").fill("¡Hola Flor! Sí, lo tenemos en azul. Te escribimos por privado.");
        await comment.getByRole("button", { name: "Enviar" }).dispatchEvent("click");
        await comment.getByText("Respondido en público").waitFor();
        await page.waitForTimeout(300);
      },
    },
    {
      at: 23.7,
      run: async () => {
        await stage.open("a", "/app/agents");
        const frame = stage.frame("a");
        await frame.getByRole("button", { name: "Nuevo agente" }).dispatchEvent("click");
        const dialog = frame.getByRole("dialog", { name: "Nuevo agente" });
        await dialog.waitFor();
        await dialog.getByLabel("Nombre").fill("Mayoristas");
        await dialog.getByLabel("Instrucciones").fill("Atendé a comercios y revendedores. Pasá la lista mayorista y pedí el CUIT.");
        const rule = dialog.locator(".scopes-editor");
        await rule.getByLabel("Canal").first().selectOption({ label: "WhatsApp" });
        await rule.getByLabel("Categoría").first().selectOption({ label: "Mayorista" });
        await rule.getByLabel("Modo").first().selectOption({ label: "Automático" });
        await page.waitForTimeout(200);
      },
    },
    {
      at: 25.2,
      run: async () => {
        await stage.open("b", "/app/metrics");
        const frame = stage.frame("b");
        await frame.locator(".breakdown-table").waitFor();
        await page.waitForTimeout(900);
        await stage.scrollTo("b", ".breakdown-table", 150);
      },
    },
    {
      at: 26.7,
      run: async () => {
        await stage.open("a", "/app/leads");
        await stage.frame("a").locator(".leads-row").nth(20).waitFor();
      },
    },
  ];
}

async function record(frames: string) {
  checkLoad();
  await reset();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, locale: "es-AR" });
  const page = await context.newPage();
  await login(page);
  const assets = await collectAssets(page);
  const ids = await conversations(context);

  await page.route(`${APP}/__promo`, (route) => route.fulfill({ contentType: "text/html", body: stageHtml(assets) }));
  await page.goto(`${APP}/__promo`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((data) => window.promo.load(data), script);

  const stage = new Stage(page);
  const pending = steps(stage, ids);
  const client = await context.newCDPSession(page);
  const started = Date.now();
  const indices = PREVIEW ? PREVIEW.map((at) => Math.round(at * FPS)) : Array.from({ length: TOTAL_FRAMES }, (_, index) => index);
  for (const index of indices) {
    const t = index / FPS;
    while (pending.length && pending[0].at <= t) await pending.shift()!.run();
    await page.evaluate((time) => window.promo.render(time), t);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const shot = await client.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(frames, frameName(index)), Buffer.from(shot.data, "base64"));
    if (index % (FPS * 5) === 0) console.log(`promo: ${t.toFixed(0)} s rendered, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  }
  await browser.close();
}

const frameName = (index: number) => `frame-${String(index).padStart(6, "0")}.png`;

function encode(frames: string, file: string, filter?: string) {
  execFileSync(
    FFMPEG,
    [
      "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "frame-%06d.png"),
      ...(filter ? ["-vf", filter] : []), "-frames:v", String(TOTAL_FRAMES),
      "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", file,
    ],
    { stdio: "inherit" },
  );
}

function deliver(frames: string) {
  encode(frames, join(OUT, "boxlead-promo-9x16.mp4"));
  encode(frames, join(OUT, "boxlead-promo-1x1.mp4"), "crop=1080:1080:0:420");
  copyFileSync(join(frames, frameName(Math.round(POSTER_AT * FPS))), join(OUT, "boxlead-promo-poster.png"));
  const stills = join(OUT, "stills");
  mkdirSync(stills, { recursive: true });
  STILLS.forEach((at, index) => {
    copyFileSync(join(frames, frameName(Math.round(at * FPS))), join(stills, `scene-${String(index + 1).padStart(2, "0")}-${at.toFixed(1)}s.png`));
  });
  console.log(`promo: ${TOTAL_FRAMES} frames, ${DURATION} s, videos and poster at ${OUT}`);
}

const frames = join(OUT, "frames");
if (!process.argv.includes("--encode-only")) await record(frames);
if (!PREVIEW) deliver(frames);
