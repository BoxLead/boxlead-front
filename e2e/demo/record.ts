import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type CDPSession, type Locator, type Page } from "playwright";
import { installOverlay, type CaptionPlacement } from "./overlay.ts";

const APP = process.env.DEMO_APP_URL ?? "http://localhost:5173";
const API = process.env.DEMO_API_URL ?? "http://localhost:8090";
const OUT = resolve(process.env.DEMO_OUT ?? "demo-video");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const VIEWPORT = { width: 1440, height: 810 };
const SCALE = 4 / 3;
const FPS = 30;
const SPEED = Number(process.env.DEMO_SPEED ?? 1.2);
const LAST_FRAME_SECONDS = 1.5;

type Frame = { file: string; at: number };

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

class Director {
  private x = VIEWPORT.width / 2;
  private y = VIEWPORT.height / 2;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async caption(kicker: string, text: string, placement: CaptionPlacement = "bottom") {
    await this.page.evaluate(([k, t, p]) => window.demo.caption(k, t, p as CaptionPlacement), [kicker, text, placement]);
  }

  async hideCaption() {
    await this.page.evaluate(() => window.demo.hideCaption());
  }

  async glide(x: number, y: number, ms = 420) {
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
    await sleep(70);
    await this.page.mouse.down();
    await sleep(60);
    await this.page.mouse.up();
    await sleep(150);
    await this.page.evaluate(() => window.demo.raise());
  }

  async type(target: Locator, text: string, delay = 28) {
    await this.click(target);
    await target.pressSequentially(text, { delay });
  }

  async scroll(target: Locator, distance: number, ms: number) {
    await this.point(target, 350);
    const start = Date.now();
    let done = 0;
    while (done < 1) {
      const t = Math.min((Date.now() - start) / ms, 1);
      await this.page.mouse.wheel(0, distance * (t - done));
      done = t;
      await sleep(16);
    }
  }
}

async function capture(client: CDPSession, dir: string): Promise<{ frames: Frame[]; stop: () => Promise<void> }> {
  const frames: Frame[] = [];
  client.on("Page.screencastFrame", (event) => {
    const file = `frame-${String(frames.length).padStart(6, "0")}.jpg`;
    writeFileSync(join(dir, file), Buffer.from(event.data, "base64"));
    frames.push({ file, at: event.metadata.timestamp ?? Date.now() / 1000 });
    void client.send("Page.screencastFrameAck", { sessionId: event.sessionId });
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: Math.round(VIEWPORT.width * SCALE),
    maxHeight: Math.round(VIEWPORT.height * SCALE),
    everyNthFrame: 1,
  });
  return { frames, stop: () => client.send("Page.stopScreencast").then(() => undefined) };
}

function encode(dir: string, frames: Frame[], output: string) {
  const lines = frames.flatMap((frame, index) => {
    const next = frames[index + 1];
    const seconds = next ? Math.max(next.at - frame.at, 0) : LAST_FRAME_SECONDS;
    return [`file '${frame.file}'`, `duration ${seconds.toFixed(4)}`];
  });
  lines.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(join(dir, "frames.txt"), `${lines.join("\n")}\n`);
  execFileSync(
    FFMPEG,
    [
      "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt",
      "-vf", `setpts=PTS/${SPEED},fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", output,
    ],
    { cwd: dir, stdio: "inherit" },
  );
}

async function login(page: Page) {
  await page.goto(`${APP}/login`);
  await page.locator('input[name="email"]').fill("demo@boxlead.app");
  await page.locator('input[name="password"]').fill("demo1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/app/inbox");
}

async function conversation(d: Director, name: string) {
  await d.click(d.page.getByRole("link", { name: new RegExp(name) }).first(), 550);
  await d.page.getByRole("region", { name: `Conversación con ${name}` }).waitFor();
}

async function sidebar(d: Director, label: string) {
  await d.click(d.page.getByRole("navigation").getByRole("link", { name: label }), 600);
  await d.page.getByRole("heading", { level: 1, name: label }).waitFor();
}

async function scenes(d: Director) {
  const page = d.page;
  const started = Date.now();
  const mark = (scene: string) => console.log(`demo: ${((Date.now() - started) / 1000).toFixed(1)} s ${scene}`);

  await page.goto(APP);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await sleep(500);
  await d.caption("BoxLead", "Vendé por chat en todos tus canales, con agentes de IA");
  await sleep(3300);
  await d.click(page.getByRole("link", { name: "Ingresar" }).first());
  await page.waitForURL("**/app/inbox");
  await page.getByRole("link", { name: /LUCASRIVERO_77/ }).waitFor();

  await d.caption("Bandeja", "Todos tus canales en una sola bandeja");
  await sleep(900);
  const list = page.getByRole("list", { name: "Conversaciones" });
  await d.scroll(list, 2600, 1800);
  await sleep(300);
  await d.scroll(list, -2600, 700);
  await d.click(page.getByRole("button", { name: /^MercadoLibre/ }));
  await sleep(900);
  const everything = page.getByRole("group", { name: "Canal" }).getByRole("button", { name: /^Todos/ });
  await d.click(everything);
  if ((await everything.getAttribute("aria-pressed")) !== "true") await everything.click();
  await page.getByRole("link", { name: /Valentina Ruiz/ }).first().waitFor();
  await sleep(300);

  mark("mercadolibre");
  await conversation(d, "LUCASRIVERO_77");
  await d.caption("MercadoLibre", "Cada pregunta llega con su publicación al lado", "top");
  await sleep(1300);
  await d.type(page.getByLabel(/Responder a LUCASRIVERO_77/), "¡Sí! A Córdoba llega en 48 a 72 h hábiles.");
  await d.click(page.getByRole("button", { name: "Responder" }));
  await sleep(1300);

  mark("draft");
  await conversation(d, "Valentina Ruiz");
  await d.caption("Agente de IA", "El agente deja la respuesta lista y vos la mandás", "top");
  await sleep(2200);
  await d.click(page.getByRole("button", { name: "Enviar borrador" }));
  await sleep(1600);

  mark("handoff");
  await conversation(d, "martu.home");
  await d.caption("Derivación", "Si hace falta una persona, el agente te avisa", "top");
  await sleep(2200);

  mark("instagram");
  await conversation(d, "flor.deco");
  await d.caption("Instagram", "Respondé comentarios de Instagram en público", "top");
  await sleep(700);
  await d.click(page.getByRole("button", { name: "Responder en público" }).first());
  await d.type(page.getByLabel(/Responder en público a flor.deco/), "¡Hola Flor! Lo tenemos en azul, te escribimos por privado");
  await d.click(page.locator(".comment-event").getByRole("button", { name: "Enviar" }));
  await sleep(1400);

  mark("template");
  await d.type(page.getByPlaceholder("Buscar por nombre o mensaje"), "Diego", 70);
  await sleep(500);
  await conversation(d, "Diego Fernández");
  await d.caption("WhatsApp", "¿Pasaron 24 horas? Retomá con una plantilla aprobada", "top");
  await sleep(600);
  await d.click(page.getByRole("button", { name: "Plantilla" }));
  const dialog = page.getByRole("dialog", { name: "Responder con una plantilla" });
  await sleep(500);
  await d.click(dialog.getByRole("button", { name: /back in stock/i }));
  await d.type(dialog.getByLabel("Valor 1"), "Diego", 60);
  await d.type(dialog.getByLabel("Valor 2"), "el Sony XM5 blanco", 35);
  await sleep(700);
  await d.click(dialog.getByRole("button", { name: "Enviar plantilla" }));
  await sleep(1200);

  mark("leads");
  await sidebar(d, "Leads");
  await d.caption("Leads", "Cientos de leads con su estado, canal y categoría", "bottom");
  await sleep(1500);
  await d.scroll(page.locator("main"), 900, 1200);
  await sleep(600);

  mark("metrics");
  await sidebar(d, "Métricas");
  await d.caption("Métricas", "Qué canal trae más leads y cuánto califican", "bottom");
  await sleep(1700);
  await d.click(page.getByRole("tab", { name: /^Calificación/ }));
  await sleep(1000);
  const chart = page.getByRole("group", { name: /Calificación/ }).first();
  const box = await chart.boundingBox();
  if (box) {
    await d.glide(box.x + box.width * 0.35, box.y + box.height * 0.5, 600);
    await d.glide(box.x + box.width * 0.8, box.y + box.height * 0.45, 1100);
  }
  await sleep(400);

  mark("agents");
  await sidebar(d, "Agentes");
  await d.caption("Agentes", "Agentes que responden solos, con el contexto de tu negocio", "bottom");
  await sleep(1200);
  await d.scroll(page.locator("main"), 700, 800);
  await sleep(300);
  await d.click(page.getByRole("button", { name: "Probar" }).first());
  const trial = page.getByRole("dialog", { name: /Probar Ventas/ });
  await d.caption("Agentes", "Probalos antes de soltarlos", "top");
  await d.type(trial.getByLabel("Mensaje del cliente"), "¿Hacen envíos a Córdoba?", 40);
  await d.click(trial.getByRole("button", { name: "Enviar" }));
  await trial.locator(".playground-turn-agent").filter({ hasText: "seguimiento" }).waitFor();
  await sleep(1800);
  await d.click(trial.getByRole("button", { name: "Cerrar" }));

  mark("connections");
  await sidebar(d, "Conexiones");
  await d.caption("Conexiones", "Conectás tus canales y empezás a responder", "bottom");
  await sleep(2300);
  await d.hideCaption();

  mark("outro");
  const logo = await page.locator("aside svg").first().evaluate((node) => node.outerHTML);
  await page.evaluate(
    (mark) =>
      window.demo.card(
        `<div class="demo-card-body"><div class="demo-card-logo">${mark}<span><strong>BOX</strong>LEAD</span></div><p class="demo-card-title">Todas tus ventas por chat,<br><em>en un solo lugar.</em></p><p class="demo-card-sub">Agentes de IA para MercadoLibre, WhatsApp, Instagram y Messenger.</p><span class="demo-card-url">boxlead.app</span><span class="demo-card-note">Datos de ejemplo</span></div>`,
      ),
    logo,
  );
  await sleep(3800);
}

async function main() {
  const reset = await fetch(`${API}/__reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify({ scenario: "showcase" }),
  });
  if (!reset.ok) throw new Error(`demo: could not load the showcase scenario (${reset.status})`);

  const frames = join(OUT, "frames");
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "es-AR" });
  await context.addInitScript(installOverlay);
  const page = await context.newPage();
  await login(page);

  const client = await context.newCDPSession(page);
  const recording = await capture(client, frames);
  try {
    await scenes(new Director(page));
  } finally {
    await recording.stop();
    await browser.close();
  }

  const output = join(OUT, "boxlead-demo.mp4");
  encode(frames, recording.frames, output);
  console.log(`demo: ${recording.frames.length} frames, video at ${output}`);
}

await main();
