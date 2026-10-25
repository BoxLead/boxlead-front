import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type FrameLocator, type Page } from "playwright";
import {
  LAYOUTS,
  stageHtml,
  type Assets,
  type Format,
  type Chip,
  type Layer,
  type Line,
  type Notice,
  type Platform,
  type Problem,
  type Script,
  type Shot,
  type StreamItem,
} from "./stage.ts";

const APP = process.env.DEMO_APP_URL ?? "http://localhost:5173";
const API = process.env.DEMO_API_URL ?? "http://localhost:8090";
const OUT = resolve(process.env.PROMO_OUT ?? "promo-video");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const FPS = 30;
const DURATION = 45;
const TOTAL_FRAMES = FPS * DURATION;
const MAX_LOAD_PER_CORE = 0.75;
const POSTER_AT = 12.6;
const STILLS = [1.1, 5.6, 8.0, 9.9, 12.6, 15.0, 18.2, 20.8, 23.3, 25.8, 28.3, 30.8, 33.3, 37.0, 43.5];
const STREAM_SIZE = 72;
const HEADERS = { "X-Requested-With": "boxlead-web" };
const HERO_PAIRS: Array<[RegExp, RegExp]> = [
  [/otro color/i, /negro y en azul/i],
  [/equipar un local/i, /precio por cantidad/i],
  [/precio tiene en efectivo/i, /transferencia/i],
];
const PLATFORMS: Record<string, Platform> = { WHATSAPP: "whatsapp", INSTAGRAM: "instagram", MESSENGER: "messenger", MELI: "meli" };
const STREAM_STATES = ["Respondido", "Calificado", "Respondido", "Lead creado"];
const PREVIEW = process.env.PROMO_TIMES?.split(",").map(Number) ?? null;
const FORMATS = (process.env.PROMO_FORMATS?.split(",") as Format[] | undefined) ?? ["vertical", "square"];

type Scenario = {
  opening: Line[];
  result: string;
  metrics: { line: string; path: string; selector: string; chip: string };
  replyChip: string;
  heroTimes: [string, string];
  notices: Notice[];
  problem: Problem;
};

const SCENARIOS: Record<string, Scenario> = {
  night: {
    opening: [
      { at: 0.15, until: 1.95, text: "Tu cliente escribe a las *3* *AM.*", kind: "hero" },
      { at: 2.15, until: 4.5, text: "Vos, durmiendo.", kind: "title" },
      { at: 4.7, until: 6.95, text: "Ya le compró a otro.", kind: "title" },
      { at: 9.4, until: 11.3, text: "Mismo cliente, *3* *AM.*", kind: "title" },
      { at: 11.6, until: 13.55, text: "Tu agente ya le respondió.", kind: "title" },
      { at: 13.8, until: 16.85, text: "En automático, las 24 horas.", kind: "title" },
    ],
    result: "Más ventas con el *mismo* *equipo.*",
    metrics: { line: "Sabé qué canal vende más.", path: "/app/metrics", selector: ".breakdown-table", chip: "Por canal" },
    replyChip: "Respondido solo",
    heroTimes: ["03:01", "03:02"],
    notices: [
      { platform: "whatsapp", name: "Carla Méndez", text: "¿Hay stock en negro? ¿Envían a Córdoba?" },
      { platform: "instagram", name: "tomas.rios", text: "¿Precio? ¿Tienen cuotas?" },
      { platform: "meli", name: "Pregunta nueva", text: "Buenas, ¿hacen factura A?" },
      { platform: "messenger", name: "Lucía Pereyra", text: "¿Hacen envíos a Mendoza?" },
      { platform: "whatsapp", name: "Nico Álvarez", text: "¿Sigue disponible?" },
      { platform: "instagram", name: "sofi.ok", text: "¿Cuánto sale el combo?" },
      { platform: "meli", name: "Pregunta nueva", text: "¿Tiene garantía oficial?" },
      { platform: "whatsapp", name: "Romina G.", text: "Hola, ¿están?" },
    ],
    problem: { at: 2, until: 9, tidyAt: 8.35, gauge: { kind: "clock", from: 180, to: 460, until: 4.6 }, label: "Sin responder", doneLabel: "Respondido" },
  },
  overflow: {
    opening: [
      { at: 0.15, until: 1.95, text: "Demasiados mensajes, *una* *sola* *persona.*", kind: "hero" },
      { at: 2.15, until: 4.5, text: "Algunos quedan colgados.", kind: "title" },
      { at: 4.7, until: 6.95, text: "Respondés *un* *día* *después.*", kind: "title" },
      { at: 9.4, until: 11.3, text: "Mismo mensaje, *con* *tu* *agente.*", kind: "title" },
      { at: 11.6, until: 13.55, text: "Respondido en *segundos.*", kind: "title" },
      { at: 13.8, until: 16.85, text: "Ninguno queda colgado, *24/7.*", kind: "title" },
    ],
    result: "De *un* *día* a *segundos.*",
    metrics: { line: "Medí cuánto tardás en responder.", path: "/app/metrics?metric=response", selector: ".attention-headline", chip: "Primera respuesta" },
    replyChip: "Respondido en segundos",
    heroTimes: ["14:05", "14:05"],
    notices: [
      { platform: "whatsapp", name: "Carla Méndez", text: "¿Hay stock en negro? ¿Envían a Córdoba?", time: "hace 2 días" },
      { platform: "instagram", name: "tomas.rios", text: "¿Precio? ¿Tienen cuotas?", time: "hace 1 día" },
      { platform: "meli", name: "Pregunta nueva", text: "Buenas, ¿hacen factura A?", time: "hace 1 día" },
      { platform: "messenger", name: "Lucía Pereyra", text: "¿Hacen envíos a Mendoza?", time: "hace 20 h" },
      { platform: "whatsapp", name: "Nico Álvarez", text: "¿Sigue disponible?", time: "hace 9 h" },
      { platform: "instagram", name: "sofi.ok", text: "¿Cuánto sale el combo?", time: "hace 5 h" },
      { platform: "meli", name: "Pregunta nueva", text: "¿Tiene garantía oficial?", time: "hace 2 h" },
      { platform: "whatsapp", name: "Romina G.", text: "Hola, ¿están?", time: "hace 40 min" },
    ],
    problem: {
      at: 2,
      until: 9,
      tidyAt: 8.35,
      gauge: { kind: "duration", from: 20, to: 1500, until: 6.2 },
      label: "Tiempo de respuesta",
      doneLabel: "Respondido",
      doneValue: "< 60 s",
    },
  },
};

const SCENARIO = process.env.PROMO_SCENARIO ?? "night";
const scenario = SCENARIOS[SCENARIO];
if (!scenario) throw new Error(`promo: unknown scenario ${SCENARIO}, use ${Object.keys(SCENARIOS).join(" or ")}`);

const lines: Line[] = [
  ...scenario.opening,
  { at: 17.15, until: 19.4, text: "Todos tus canales, una bandeja.", kind: "title", fast: true, kicker: "Bandeja" },
  { at: 19.65, until: 21.9, text: "Responde y califica a cada cliente.", kind: "title", fast: true, kicker: "Leads" },
  { at: 22.15, until: 24.4, text: "Te deja el borrador listo.", kind: "title", fast: true, kicker: "Borradores" },
  { at: 24.65, until: 26.9, text: "¿Hace falta una persona? Te avisa.", kind: "title", fast: true, kicker: "Derivación" },
  { at: 27.15, until: 29.4, text: "Responde comentarios de Instagram.", kind: "title", fast: true, kicker: "Instagram" },
  { at: 29.65, until: 31.9, text: "Tu agente, con tus reglas.", kind: "title", fast: true, kicker: "Agentes" },
  { at: 32.15, until: 34.4, text: scenario.metrics.line, kind: "title", fast: true, kicker: "Métricas" },
  { at: 34.9, until: 39.25, text: scenario.result, kind: "title" },
];

const shots: Shot[] = [
  { at: 9, until: 17, layer: "a", enter: "wipe-up", focus: { selector: ".chat-thread", zoom: 1.6, align: "top" } },
  { at: 17, until: 19.5, layer: "b", enter: "wipe-right", focus: { selector: ".conversation-stages", align: "keep", ring: true } },
  { at: 19.5, until: 22, layer: "a", enter: "wipe-up", focus: { selector: ".leads-row", zoom: 1.8, ring: true } },
  { at: 22, until: 24.5, layer: "b", enter: "wipe-left", focus: { selector: ".draft-banner", zoom: 1.75, ring: true } },
  { at: 24.5, until: 27, layer: "a", enter: "wipe-up", focus: { selector: ".banner", zoom: 1.8, ring: true } },
  { at: 27, until: 29.5, layer: "b", enter: "wipe-right", focus: { selector: ".comment-event-outbound", zoom: 1.65, ring: true } },
  { at: 29.5, until: 32, layer: "a", enter: "wipe-up", focus: { selector: ".agent-textarea", zoom: 1.6, ring: true } },
  { at: 32, until: 34.5, layer: "b", enter: "wipe-left", focus: { selector: scenario.metrics.selector, ring: true } },
];

const chips: Chip[] = [
  { at: 11.9, until: 16.75, text: scenario.replyChip, tone: "green", anchor: { layer: "a", selector: "[data-promo-reply]", dx: -4, dy: -26 } },
  { at: 20.1, until: 21.85, text: "Calificado", tone: "green", anchor: { layer: "a", selector: ".leads-row", dx: -20, dy: -14 } },
  { at: 22.6, until: 24.35, text: "Borrador listo", tone: "blue", anchor: { layer: "b", selector: ".draft-banner", dx: -16, dy: -16 } },
  { at: 25.1, until: 26.85, text: "Pidió una persona", tone: "amber", anchor: { layer: "a", selector: ".banner", dx: -16, dy: -16 } },
  { at: 27.6, until: 29.35, text: "Respondido en público", tone: "green", anchor: { layer: "b", selector: ".comment-event-outbound", dx: -16, dy: -16 } },
  { at: 30.1, until: 31.85, text: "Tus reglas", tone: "blue", anchor: { layer: "a", selector: ".agent-textarea", dx: -16, dy: -16 } },
  { at: 32.6, until: 34.35, text: scenario.metrics.chip, tone: "blue", anchor: { layer: "b", selector: scenario.metrics.selector, dx: -16, dy: -16 } },
];

function buildScript(hero: Hero, stream: StreamItem[]): Script {
  return {
    lines,
    shots,
    chips,
    notices: scenario.notices,
    effects: [
      { kind: "pin-bottom", layer: "a", at: 8.5, until: 17 },
      { kind: "typing", layer: "a", at: 10.3, until: 11.4 },
      { kind: "reveal", layer: "a", selector: "[data-promo-reply]", at: 11.4 },
    ],
    problem: scenario.problem,
    turn: { at: 7, until: 9 },
    arrival: { at: 9.25, until: 10.5, notice: { platform: "whatsapp", name: hero.name, text: hero.question }, time: scenario.heroTimes[0] },
    channels: { at: 14.2, until: 16.85 },
    pulses: [{ at: 11.45, tone: "green" }],
    stream: { at: 34.5, until: 39.5, items: stream },
    closing: { at: 39.5 },
  };
}

type Conversation = { id: string; leadName: string | null; platform: string };
type Message = { direction: "INBOUND" | "OUTBOUND"; content: string | null; agentName: string | null };
type Lead = { name: string | null; platform: string };
type Hero = { id: string; name: string; question: string };
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
  let hero: Hero | null = null;
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
      hero = { id: chat.id, name: chat.leadName ?? "Cliente", question: question.content ?? "" };
      break;
    }
  }
  if (!hero) throw new Error("promo: no WhatsApp conversation fits the hero scene");
  return { hero, valentina: byName("Valentina Ruiz"), martu: byName("martu.home"), flor: byName("flor.deco") };
}

async function streamItems(context: BrowserContext): Promise<StreamItem[]> {
  const leads = await api<Lead[]>(context, "/leads");
  return leads
    .filter((lead) => lead.name && PLATFORMS[lead.platform])
    .slice(0, STREAM_SIZE)
    .map((lead, index) => ({ platform: PLATFORMS[lead.platform], name: lead.name as string, state: STREAM_STATES[index % STREAM_STATES.length] }));
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

  async center(layer: Layer, selector: string) {
    const target = this.frame(layer).locator(selector).first();
    await target.waitFor();
    await target.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(150);
  }
}

function steps(stage: Stage, ids: Awaited<ReturnType<typeof conversations>>): Step[] {
  const { page } = stage;
  return [
    {
      at: 0,
      run: async () => {
        await stage.conversation("a", ids.hero.id);
        await stage
          .frame("a")
          .locator(".bubble-outbound")
          .last()
          .evaluate((bubble, heroTimes) => {
            bubble.setAttribute("data-promo-reply", "");
            const times = Array.from(bubble.closest(".chat-thread")!.querySelectorAll(".bubble-time")).slice(-2);
            times.forEach((time, index) => (time.textContent = heroTimes[index]));
          }, scenario.heroTimes);
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
        await stage.center("a", ".leads-row");
      },
    },
    {
      at: 19.7,
      run: async () => {
        await stage.conversation("b", ids.valentina);
        await stage.center("b", ".draft-banner");
      },
    },
    {
      at: 22.2,
      run: async () => {
        await stage.conversation("a", ids.martu);
        await stage.center("a", ".banner");
      },
    },
    {
      at: 24.7,
      run: async () => {
        await stage.conversation("b", ids.flor);
        const frame = stage.frame("b");
        const comment = frame.locator(".comment-event").first();
        await comment.getByRole("button", { name: "Responder en público" }).dispatchEvent("click");
        await frame.getByLabel("Responder en público a flor.deco").fill("¡Hola Flor! Sí, lo tenemos en azul. Te escribimos por privado.");
        await comment.getByRole("button", { name: "Enviar" }).dispatchEvent("click");
        await comment.getByText("Respondido en público").waitFor();
        await stage.center("b", ".comment-event-outbound");
      },
    },
    {
      at: 27.2,
      run: async () => {
        await stage.open("a", "/app/agents");
        const frame = stage.frame("a");
        await frame.getByRole("button", { name: "Nuevo agente" }).dispatchEvent("click");
        const form = frame.getByRole("form", { name: "Configuración del agente" });
        await form.waitFor();
        await form.getByLabel("Nombre").fill("Mayoristas");
        await form.getByLabel("Instrucciones").fill("Atendé a comercios y revendedores. Pasá la lista mayorista y pedí el CUIT.");
        const rule = form.locator(".scopes-editor");
        await rule.getByLabel("Canal").first().selectOption({ label: "WhatsApp" });
        await rule.getByLabel("Categoría").first().selectOption({ label: "Mayorista" });
        await rule.getByLabel("Modo").first().selectOption({ label: "Automático" });
        await stage.center("a", ".agent-textarea");
      },
    },
    {
      at: 29.7,
      run: async () => {
        await stage.open("b", scenario.metrics.path);
        await stage.frame("b").locator(scenario.metrics.selector).waitFor();
        await page.waitForTimeout(900);
        await stage.center("b", scenario.metrics.selector);
      },
    },
  ];
}

async function record(format: Format, frames: string) {
  const layout = LAYOUTS[format];
  checkLoad();
  await reset();
  mkdirSync(frames, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: layout.width, height: layout.height }, deviceScaleFactor: 1, locale: "es-AR", colorScheme: "dark" });
  const page = await context.newPage();
  await login(page);
  const assets = await collectAssets(page);
  const ids = await conversations(context);
  const script = buildScript(ids.hero, await streamItems(context));

  await page.route(`${APP}/__promo`, (route) => route.fulfill({ contentType: "text/html", body: stageHtml(assets, layout) }));
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
    if (index % (FPS * 5) === 0) console.log(`promo: ${format} ${t.toFixed(0)} s rendered, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  }
  await browser.close();
}

const frameName = (index: number) => `frame-${String(index).padStart(6, "0")}.png`;

function encode(frames: string, file: string) {
  execFileSync(
    FFMPEG,
    [
      "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "frame-%06d.png"), "-frames:v", String(TOTAL_FRAMES),
      "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", file,
    ],
    { stdio: "inherit" },
  );
}

function deliver() {
  const frames = framesDir("vertical");
  const output = (name: string) => join(OUT, `boxlead-promo-${SCENARIO}-${name}`);
  if (existsSync(frames)) encode(frames, output("9x16.mp4"));
  if (existsSync(framesDir("square"))) encode(framesDir("square"), output("1x1.mp4"));
  if (!existsSync(frames)) return;
  copyFileSync(join(frames, frameName(Math.round(POSTER_AT * FPS))), output("poster.png"));
  const stills = join(OUT, "stills", SCENARIO);
  mkdirSync(stills, { recursive: true });
  STILLS.forEach((at, index) => {
    copyFileSync(join(frames, frameName(Math.round(at * FPS))), join(stills, `scene-${String(index + 1).padStart(2, "0")}-${at.toFixed(1)}s.png`));
  });
  console.log(`promo: ${SCENARIO}, ${TOTAL_FRAMES} frames, ${DURATION} s, videos and poster at ${OUT}`);
}

const framesDir = (format: Format) => join(OUT, "frames", SCENARIO, format);
if (!process.argv.includes("--encode-only")) {
  for (const format of PREVIEW ? FORMATS.slice(0, 1) : FORMATS) {
    rmSync(framesDir(format), { recursive: true, force: true });
    await record(format, framesDir(format));
  }
}
if (!PREVIEW) deliver();
