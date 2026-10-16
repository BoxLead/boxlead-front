import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type CDPSession, type Locator, type Page } from "playwright";
import { installOverlay } from "./overlay.ts";
import { encode, renderCaptions, type Caption, type Frame, type Move, type Placement } from "./timeline.ts";

const APP = process.env.DEMO_APP_URL ?? "http://localhost:5173";
const API = process.env.DEMO_API_URL ?? "http://localhost:8090";
const OUT = resolve(process.env.DEMO_OUT ?? "demo-video");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const SPEED = Number(process.env.DEMO_SPEED ?? 1.2);
const VIEWPORT = { width: 1440, height: 810 };
const SCALE = 2;
const SOURCE = { width: VIEWPORT.width * SCALE, height: VIEWPORT.height * SCALE };
const OUTPUT = { width: 1920, height: 1080, fps: 30, speed: SPEED };
const CAPTION_SCALE = OUTPUT.width / VIEWPORT.width;
const MAX_ZOOM = 1.9;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const now = () => Date.now() / 1000;

class Director {
  readonly page: Page;
  readonly captions: Caption[] = [];
  readonly moves: Move[] = [];
  private x = VIEWPORT.width / 2;
  private y = VIEWPORT.height / 2;

  constructor(page: Page) {
    this.page = page;
  }

  caption(kicker: string, text: string, placement: Placement = "bottom") {
    this.endCaption();
    this.captions.push({ start: now() + 0.12, end: Number.POSITIVE_INFINITY, kicker, text, placement });
  }

  endCaption() {
    const open = this.captions.at(-1);
    if (open && open.end === Number.POSITIVE_INFINITY) open.end = now();
  }

  async focus(target: Locator, options: { zoom?: number; ms?: number; padding?: number } = {}) {
    await target.waitFor();
    const outside = await target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top < 0 || rect.bottom > window.innerHeight;
    });
    if (outside) {
      await target.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "smooth" }));
      await sleep(700);
    }
    const box = await target.boundingBox();
    if (!box) throw new Error("demo: nothing to focus on");
    const padding = options.padding ?? 1.25;
    const fit = Math.min(VIEWPORT.width / (box.width * padding), VIEWPORT.height / (box.height * padding));
    const zoom = Math.min(Math.max(options.zoom ?? fit, 1), MAX_ZOOM);
    this.moves.push({
      start: now(),
      duration: (options.ms ?? 1100) / 1000,
      to: { zoom, x: (box.x + box.width / 2) * SCALE, y: (box.y + box.height / 2) * SCALE },
    });
  }

  wide(ms = 1000) {
    this.moves.push({ start: now(), duration: ms / 1000, to: { zoom: 1, x: SOURCE.width / 2, y: SOURCE.height / 2 } });
  }

  async card(variant: "intro" | "chapter" | "outro", html: string) {
    await this.page.evaluate(([kind, markup]) => window.demo.card(kind as "intro" | "chapter" | "outro", markup), [variant, html]);
  }

  async hideCard() {
    await this.page.evaluate(() => window.demo.hideCard());
  }

  async chapter(number: string, title: string, subtitle: string) {
    this.endCaption();
    this.wide(700);
    await this.card(
      "chapter",
      `<div class="demo-stack"><span class="demo-chapter-number">${number}</span><h2 class="demo-chapter-title">${title}</h2><span class="demo-chapter-line"></span><p class="demo-chapter-sub">${subtitle}</p></div>`,
    );
    await sleep(2300);
    await this.hideCard();
    await sleep(500);
  }

  async glide(x: number, y: number, ms = 450) {
    const fromX = this.x;
    const fromY = this.y;
    const start = Date.now();
    for (;;) {
      const t = Math.min((Date.now() - start) / ms, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      await this.page.mouse.move(fromX + (x - fromX) * eased, fromY + (y - fromY) * eased);
      if (t === 1) break;
    }
    this.x = x;
    this.y = y;
  }

  async point(target: Locator, ms?: number) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("demo: target is not visible");
    await this.glide(box.x + box.width / 2, box.y + box.height / 2, ms);
  }

  async click(target: Locator, ms?: number) {
    await this.point(target, ms);
    await sleep(80);
    await this.page.mouse.down();
    await sleep(70);
    await this.page.mouse.up();
    await sleep(160);
    await this.page.evaluate(() => window.demo.raise());
  }

  async type(target: Locator, text: string, delay = 30) {
    await this.click(target);
    await target.pressSequentially(text, { delay });
  }

  async choose(select: Locator, label: string) {
    await this.click(select, 380);
    await sleep(250);
    await select.selectOption({ label });
    await sleep(350);
  }

  async scroll(target: Locator, distance: number, ms: number) {
    await this.point(target, 350);
    const start = Date.now();
    let done = 0;
    while (done < 1) {
      const t = Math.min((Date.now() - start) / ms, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await this.page.mouse.wheel(0, distance * (eased - done));
      done = eased;
      await sleep(16);
    }
  }
}

async function capture(client: CDPSession, dir: string): Promise<{ frames: Frame[]; stop: () => Promise<void> }> {
  const frames: Frame[] = [];
  client.on("Page.screencastFrame", (event) => {
    const file = `frame-${String(frames.length).padStart(6, "0")}.jpg`;
    writeFileSync(join(dir, file), Buffer.from(event.data, "base64"));
    frames.push({ file, at: now() });
    void client.send("Page.screencastFrameAck", { sessionId: event.sessionId });
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: SOURCE.width,
    maxHeight: SOURCE.height,
    everyNthFrame: 1,
  });
  return { frames, stop: () => client.send("Page.stopScreencast").then(() => undefined) };
}

async function login(page: Page) {
  await page.goto(`${APP}/login`);
  await page.locator('input[name="email"]').fill("demo@boxlead.app");
  await page.locator('input[name="password"]').fill("demo1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/app/inbox");
}

async function sidebar(d: Director, label: string) {
  await d.click(d.page.getByRole("navigation").getByRole("link", { name: label }), 600);
  await d.page.getByRole("heading", { level: 1, name: label }).waitFor();
}

async function conversation(d: Director, name: string) {
  await d.click(d.page.getByRole("link", { name: new RegExp(name) }).first(), 550);
  await d.page.getByRole("region", { name: `Conversación con ${name}` }).waitFor();
}

async function logoMarkup(page: Page) {
  return page.locator("svg").first().evaluate((node) => node.outerHTML);
}

async function opening(d: Director) {
  const page = d.page;
  await page.goto(APP);
  await page.getByRole("heading", { level: 1 }).waitFor();
  const logo = await logoMarkup(page);
  await d.card(
    "intro",
    `<div class="demo-card-glow"></div><div class="demo-stack"><div class="demo-logo">${logo}<span><strong>BOX</strong>LEAD</span></div><span class="demo-pill">Beta</span><p class="demo-headline">Agentes de IA que <em>venden por chat.</em></p></div>`,
  );
  await sleep(3400);
  await d.hideCard();
  await sleep(700);
  d.caption("BoxLead", "Responde, califica y ordena cada consulta por vos");
  await d.focus(page.getByLabel("Demostración del agente de BoxLead"), { zoom: 1.3, ms: 1400 });
  await sleep(3200);
  d.wide(900);
  await sleep(500);
  await d.click(page.getByRole("link", { name: "Ingresar" }).first());
  await page.waitForURL("**/app/inbox");
  await page.getByRole("link", { name: /LUCASRIVERO_77/ }).waitFor();
}

async function agents(d: Director) {
  const page = d.page;
  await sidebar(d, "Agentes");
  await d.chapter("01", "Agentes de IA", "Atienden a tus clientes por vos, con tus reglas");

  d.caption("Contexto del negocio", "Le contás tu negocio y todos tus agentes lo usan");
  await d.focus(page.getByRole("region", { name: /Contexto del negocio/i }), { ms: 1200 });
  await sleep(1600);
  await d.point(page.getByRole("switch", { name: /Categorizar leads/ }), 700);
  d.caption("Contexto del negocio", "Y etiquetan cada lead con su categoría");
  await sleep(2000);
  d.wide(900);

  await d.scroll(page.locator("main"), 760, 900);
  await sleep(300);
  d.caption("Tus agentes", "Cada agente con su rol y sus reglas");
  await d.focus(page.getByRole("list", { name: "Agentes", exact: true }), { ms: 1200, padding: 1.08 });
  await sleep(2600);
  await d.focus(page.getByRole("region", { name: /Actividad de Ventas/ }).first(), { zoom: 1.75, ms: 1100 });
  d.caption("Actividad", "Respuestas, borradores y derivaciones del último mes");
  await sleep(2600);
  d.wide(800);

  await d.click(page.getByRole("button", { name: "Ver actividad de Ventas" }));
  const activity = page.getByRole("dialog", { name: "Actividad de Ventas" });
  await activity.waitFor();
  d.caption("Actividad", "Cada decisión, con un clic a la conversación", "top");
  await d.focus(activity, { padding: 1.12, ms: 1000 });
  await sleep(1500);
  await d.scroll(activity.getByRole("list"), 420, 1100);
  await sleep(1200);
  d.wide(700);
  await d.click(activity.getByRole("button", { name: "Cerrar" }));
  await sleep(400);

  await d.click(page.getByRole("button", { name: "Nuevo agente" }));
  const dialog = page.getByRole("dialog", { name: "Nuevo agente" });
  await dialog.waitFor();
  d.caption("Nuevo agente", "Creás un agente nuevo con tus propias instrucciones", "top");
  await d.focus(dialog.getByLabel("Nombre").locator("xpath=ancestor::form[1]"), { zoom: 1.35, ms: 1000 });
  await d.type(dialog.getByLabel("Nombre"), "Mayoristas", 45);
  await d.type(
    dialog.getByLabel("Instrucciones"),
    "Atendé a comercios y revendedores. Pasá la lista mayorista y pedí el CUIT.",
    22,
  );
  await sleep(500);
  const rule = dialog.locator(".scopes-editor");
  d.caption("Reglas", "Dónde trabaja y si responde solo o deja un borrador", "top");
  await d.focus(rule, { padding: 1.12, ms: 1100 });
  await d.choose(rule.getByLabel("Canal").first(), "WhatsApp");
  await d.choose(rule.getByLabel("Categoría").first(), "Mayorista");
  await d.choose(rule.getByLabel("Modo").first(), "Automático");
  await sleep(900);
  d.wide(800);
  await d.click(dialog.getByRole("button", { name: "Crear agente" }));
  await page.getByRole("button", { name: "Probar Mayoristas" }).waitFor();
  await sleep(600);
  await d.focus(page.getByRole("button", { name: "Probar Mayoristas" }).locator("xpath=ancestor::li[1]"), { zoom: 1.6, ms: 1000 });
  d.caption("Nuevo agente", "Listo, ya está trabajando en tus conversaciones");
  await sleep(2000);
  d.wide(800);

  await d.click(page.getByRole("button", { name: "Probar Mayoristas" }));
  const trial = page.getByRole("dialog", { name: /Probar Mayoristas/ });
  await trial.waitFor();
  await d.choose(trial.getByLabel("Canal"), "WhatsApp");
  await d.choose(trial.getByLabel("Categoría del lead"), "Mayorista");
  d.caption("Playground", "Lo probás como un cliente antes de activarlo", "top");
  await d.focus(trial, { padding: 1.06, ms: 1000 });
  await d.type(trial.getByLabel("Mensaje del cliente"), "Tengo un local en Rosario, ¿venden por mayor?", 34);
  await d.click(trial.getByRole("button", { name: "Enviar" }));
  await trial.locator(".playground-turn-agent").filter({ hasText: "CUIT" }).waitFor();
  await sleep(2200);
  await d.type(trial.getByLabel("Mensaje del cliente"), "Prefiero hablar con una persona", 34);
  await d.click(trial.getByRole("button", { name: "Enviar" }));
  const result = trial.getByText(/derivaría a una persona/);
  await result.waitFor();
  d.caption("Derivación", "Y sabe cuándo pasarle la conversación a una persona", "top");
  await d.focus(trial.getByRole("region", { name: "Resultado de la prueba" }), { zoom: 1.7, ms: 1000 });
  await sleep(2800);
  d.wide(800);
  await d.click(trial.getByRole("button", { name: "Cerrar" }));
  await sleep(300);
}

async function inbox(d: Director) {
  const page = d.page;
  await sidebar(d, "Bandeja");
  await page.getByRole("link", { name: /LUCASRIVERO_77/ }).waitFor();
  await d.chapter("02", "Tus agentes en acción", "Todos tus canales en una sola bandeja");

  d.caption("Bandeja", "Todos tus canales en una sola bandeja");
  const list = page.getByRole("list", { name: "Conversaciones" });
  await d.scroll(list, 2400, 1700);
  await sleep(200);
  await d.scroll(list, -2400, 800);
  await sleep(300);

  await conversation(d, "Valentina Ruiz");
  d.caption("Borradores", "Deja la respuesta lista y vos la mandás", "top");
  await d.focus(page.locator(".draft-banner"), { zoom: 1.6, ms: 1000 });
  await sleep(2400);
  await d.click(page.getByRole("button", { name: "Enviar borrador" }));
  await sleep(1200);
  d.wide(800);

  await conversation(d, "LUCASRIVERO_77");
  d.caption("MercadoLibre", "Responde solo las preguntas de MercadoLibre", "top");
  await d.focus(page.locator(".question-group").first(), {
    zoom: 1.6,
    ms: 1000,
  });
  await sleep(2600);
  d.wide(800);

  await conversation(d, "martu.home");
  d.caption("Derivación", "Si hace falta una persona, el agente te avisa", "top");
  await d.focus(page.locator(".banner").filter({ hasText: "Un agente pidió tu atención" }), {
    zoom: 1.8,
    ms: 1000,
  });
  await sleep(2400);
  d.wide(800);

  await d.type(page.getByPlaceholder("Buscar por nombre o mensaje"), "Diego", 70);
  await sleep(400);
  await conversation(d, "Diego Fernández");
  d.caption("WhatsApp", "¿Pasaron 24 horas? Retomá con una plantilla", "top");
  await d.click(page.getByRole("button", { name: "Plantilla" }));
  const templates = page.getByRole("dialog", { name: "Responder con una plantilla" });
  await templates.waitFor();
  await d.focus(templates, { padding: 1.1, ms: 900 });
  await d.click(templates.getByRole("button", { name: /back in stock/i }));
  await d.type(templates.getByLabel("Valor 1"), "Diego", 55);
  await d.type(templates.getByLabel("Valor 2"), "el Sony XM5 blanco", 32);
  await sleep(700);
  await d.click(templates.getByRole("button", { name: "Enviar plantilla" }));
  await sleep(1100);
  d.wide(800);
}

async function metrics(d: Director) {
  const page = d.page;
  await sidebar(d, "Métricas");
  await d.chapter("03", "Métricas", "Sabé qué funciona y dónde poner foco");

  d.caption("Métricas", "Leads, respuesta y calificación de un vistazo");
  await sleep(1500);
  await d.focus(page.getByRole("region", { name: "Señales" }), { zoom: 1.6, ms: 1000 });
  d.caption("Señales", "Te avisa qué canal rinde más y qué está cambiando");
  await sleep(2400);
  d.wide(800);

  const chart = page.getByRole("group", { name: /por día/ }).first();
  const box = await chart.boundingBox();
  if (box) {
    d.caption("Proyección", "Y proyecta los leads de las próximas dos semanas");
    await d.focus(chart, { zoom: 1.35, ms: 1000 });
    await d.glide(box.x + box.width * 0.55, box.y + box.height * 0.5, 600);
    await d.glide(box.x + box.width * 0.97, box.y + box.height * 0.45, 1400);
    await sleep(1200);
    d.wide(800);
  }

  await d.scroll(page.locator("main"), 640, 900);
  d.caption("Embudo", "De lead a calificado, paso por paso");
  await d.focus(page.getByRole("region", { name: "Embudo" }), { padding: 1.08, ms: 1000 });
  for (const stage of await page.getByRole("region", { name: "Embudo" }).getByRole("button").all()) {
    await d.point(stage, 500);
    await sleep(500);
  }
  d.wide(800);

  await d.scroll(page.locator("main"), 480, 800);
  d.caption("Desglose", "Qué canal y qué categoría traen mejores clientes");
  await d.focus(page.getByRole("region", { name: "Desglose" }), { padding: 1.08, ms: 1000 });
  await d.click(page.getByRole("region", { name: "Desglose" }).getByRole("group", { name: "Agrupar por" }).getByRole("button", { name: "Categoría" }));
  await sleep(1600);
  await d.focus(page.getByRole("region", { name: "Atención" }), { zoom: 1.6, ms: 1000 });
  d.caption("Atención", "Cuánto resuelve el agente y cuántas horas te ahorra");
  await sleep(2400);
  d.wide(800);

  await d.scroll(page.locator("main"), 600, 800);
  d.caption("Horarios", "Cuándo te escriben, para organizar a tu equipo");
  const cells = page.locator(".hours-cell");
  await d.focus(cells.nth(80).locator("xpath=ancestor::section[1]"), { padding: 1.06, ms: 1000 });
  for (const index of [24 + 19, 24 * 2 + 20, 24 * 3 + 21]) {
    await d.point(cells.nth(index), 500);
    await sleep(450);
  }
  d.wide(800);
}

async function closing(d: Director) {
  const page = d.page;
  await sidebar(d, "Leads");
  d.caption("Leads", "Cientos de leads, ordenados y calificados");
  await sleep(1800);
  d.endCaption();
  d.wide(600);
  await sleep(300);
  const logo = await logoMarkup(page);
  await d.card(
    "outro",
    `<div class="demo-card-glow"></div><div class="demo-stack"><div class="demo-logo">${logo}<span><strong>BOX</strong>LEAD</span></div><p class="demo-headline">Escalá tu negocio <em>con agentes que venden por vos.</em></p><p class="demo-sub">Atienden cada consulta de MercadoLibre, WhatsApp, Instagram y Messenger, a toda hora, mientras vos te enfocás en vender más.</p><div class="demo-values"><span class="demo-value">Responden por vos</span><span class="demo-value">Ordenan cada lead</span><span class="demo-value">Te muestran qué rinde</span></div><div class="demo-cta"><span class="demo-cta-primary">Sumate a la beta</span><span class="demo-cta-url">boxlead.app</span></div><span class="demo-note">Datos de ejemplo</span></div>`,
  );
  await sleep(9500);
}

type Recorded = { frames: Frame[]; moves: Move[]; captions: Caption[]; captionFiles: string[] };

function render(dir: string, recorded: Recorded) {
  const file = join(OUT, "boxlead-demo.mp4");
  encode({ ffmpeg: FFMPEG, dir, ...recorded, source: SOURCE, output: OUTPUT, file });
  console.log(
    `demo: ${recorded.frames.length} frames, ${recorded.moves.length} camera moves, ${recorded.captions.length} captions, video at ${file}`,
  );
}

async function record(dir: string): Promise<Recorded> {
  const reset = await fetch(`${API}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario: "showcase" }),
  });
  if (!reset.ok) throw new Error(`demo: could not load the showcase scenario (${reset.status})`);

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "es-AR" });
  await context.addInitScript(installOverlay);
  const page = await context.newPage();
  await login(page);

  const director = new Director(page);
  const client = await context.newCDPSession(page);
  const recording = await capture(client, dir);
  const started = Date.now();
  const mark = (scene: string) => console.log(`demo: ${((Date.now() - started) / 1000).toFixed(1)} s ${scene}`);
  try {
    mark("opening");
    await opening(director);
    mark("agents");
    await agents(director);
    mark("inbox");
    await inbox(director);
    mark("metrics");
    await metrics(director);
    mark("closing");
    await closing(director);
    mark("end");
  } finally {
    await recording.stop();
    director.endCaption();
  }
  const captionFiles = await renderCaptions(browser, APP, director.captions, dir, CAPTION_SCALE);
  await browser.close();
  const recorded = { frames: recording.frames, moves: director.moves, captions: director.captions, captionFiles };
  writeFileSync(join(dir, "timeline.json"), JSON.stringify(recorded));
  return recorded;
}

const frames = join(OUT, "frames");
const recorded = process.argv.includes("--encode-only")
  ? (JSON.parse(readFileSync(join(frames, "timeline.json"), "utf8")) as Recorded)
  : await record(frames);
render(frames, recorded);
