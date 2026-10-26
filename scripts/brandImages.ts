import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const FONT = pathToFileURL(require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).href

const NAVY = '#0a1521'
const CREAM = '#eaeadc'
const ACCENT = '#8fc1ee'
const MARK =
  '<svg viewBox="310 280 384 460" fill="none" stroke="currentColor" stroke-width="22" stroke-linejoin="round" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M502 722 398 656q-22-16-3-33l23-22 22 33 28-104H356l28 32-28 24q-28 20-28-14V402l174-104 174 104v210L502 722Z"/><path d="M328 402l174 103 174-103M502 505v217"/></svg>'

type Card = { file: string; title: string; subtitle: string; label: string }

const CARDS: Card[] = [
  { file: 'boxlead', label: 'Agentes de IA para ventas', title: 'Tus leads respondidos, calificados y ordenados en automático', subtitle: 'WhatsApp, Instagram, Messenger y MercadoLibre en una sola bandeja, las 24 horas.' },
  { file: 'whatsapp', label: 'WhatsApp Business', title: 'Un agente de IA que responde tu WhatsApp Business', subtitle: 'Responde en segundos dentro de la ventana de 24 horas y usa plantillas aprobadas cuando se cierra.' },
  { file: 'instagram', label: 'Instagram', title: 'Mensajes directos y comentarios de Instagram respondidos por un agente', subtitle: 'Cada persona en una sola conversación, con respuesta pública en el comentario y privada por mensaje.' },
  { file: 'messenger', label: 'Messenger', title: 'Los mensajes de tu página de Facebook, atendidos en automático', subtitle: 'El agente responde en nombre de tu página y deja el lead listo en tu bandeja.' },
  { file: 'mercadolibre', label: 'MercadoLibre', title: 'Preguntas y mensajes de postventa de MercadoLibre con respuesta inmediata', subtitle: 'Un agente que contesta las preguntas de tus publicaciones y acompaña cada venta.' },
  { file: 'agencias', label: 'Para agencias y community managers', title: 'Sumá un agente de IA a cada cliente que atendés', subtitle: 'Conectá sus canales, configurá el tono y mostrá resultados sin sumar horas de atención.' },
]

function base(): string {
  return `<style>
    @font-face { font-family: "Inter"; src: url("${FONT}") format("woff2"); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    html, body { background: ${NAVY}; font-family: Inter, system-ui, sans-serif; color: ${CREAM}; -webkit-font-smoothing: antialiased; }
  </style>`
}

function card({ label, title, subtitle }: Card): string {
  return `<!doctype html><html><head><meta charset="utf-8">${base()}<style>
    body { width: 1200px; height: 630px; overflow: hidden; position: relative; }
    .grid { position: absolute; inset: 0; background:
      radial-gradient(ellipse 60% 70% at 85% 20%, rgba(36, 82, 124, 0.55), transparent 70%),
      linear-gradient(rgba(234, 234, 220, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(234, 234, 220, 0.045) 1px, transparent 1px);
      background-size: auto, 56px 56px, 56px 56px; }
    .frame { position: absolute; inset: 56px 64px; display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 18px; font-size: 34px; letter-spacing: 0.04em; }
    .brand svg { width: 44px; height: 53px; color: ${CREAM}; }
    .brand b { font-weight: 700; } .brand span { font-weight: 400; }
    .label { display: inline-flex; align-items: center; gap: 12px; padding: 10px 18px; border: 1px solid rgba(143, 193, 238, 0.35); border-radius: 999px; color: ${ACCENT}; font-size: 22px; font-weight: 500; margin-bottom: 28px; }
    .label i { width: 10px; height: 10px; border-radius: 50%; background: #5fd3a0; }
    h1 { font-size: 60px; line-height: 1.08; letter-spacing: -0.03em; font-weight: 650; color: #f1f1e6; max-width: 980px; }
    p { margin-top: 22px; font-size: 27px; line-height: 1.4; color: #b7c4d0; max-width: 900px; }
    .foot { display: flex; justify-content: space-between; align-items: center; color: #7c8c9b; font-size: 22px; }
    .foot b { color: ${CREAM}; font-weight: 500; }
    .line { height: 4px; width: 120px; background: ${ACCENT}; border-radius: 2px; }
  </style></head><body><div class="grid"></div><div class="frame">
    <div class="brand">${MARK}<div><b>BOX</b><span>LEAD</span></div></div>
    <div><div class="label"><i></i>${label}</div><h1>${title}</h1><p>${subtitle}</p></div>
    <div class="foot"><div class="line"></div><div><b>boxlead.app</b></div></div>
  </div></body></html>`
}

function icon(size: number, radius: number, padding: number): string {
  return `<!doctype html><html><head><meta charset="utf-8">${base()}<style>
    html, body { background: transparent; }
    body { width: ${size}px; height: ${size}px; overflow: hidden; }
    .tile { width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: #132c44; display: grid; place-items: center; }
    .tile svg { width: ${size - padding * 2}px; height: ${size - padding * 2}px; color: ${CREAM}; }
  </style></head><body><div class="tile">${MARK}</div></body></html>`
}

function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const entries: Buffer[] = []
  let offset = 6 + 16 * images.length
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += png.length
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)])
}

async function main() {
  const out = resolve(process.cwd(), 'public')
  mkdirSync(resolve(out, 'og'), { recursive: true })
  mkdirSync(resolve(out, 'icons'), { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })

  for (const item of CARDS) {
    await page.setViewportSize({ width: 1200, height: 630 })
    await page.setContent(card(item), { waitUntil: 'networkidle' })
    await page.evaluate('document.fonts.ready')
    await page.screenshot({ path: resolve(out, 'og', `${item.file}.png`), type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } })
  }

  const renderIcon = async (size: number, radius: number, padding: number) => {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(icon(size, radius, padding), { waitUntil: 'load' })
    return page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  }

  writeFileSync(resolve(out, 'icons', 'icon-192.png'), await renderIcon(192, 42, 36))
  writeFileSync(resolve(out, 'icons', 'icon-512.png'), await renderIcon(512, 112, 96))
  writeFileSync(resolve(out, 'icons', 'maskable-512.png'), await renderIcon(512, 0, 140))
  writeFileSync(resolve(out, 'apple-touch-icon.png'), await renderIcon(180, 0, 34))
  writeFileSync(resolve(out, 'favicon.ico'), ico([
    { size: 16, png: await renderIcon(16, 4, 3) },
    { size: 32, png: await renderIcon(32, 7, 6) },
    { size: 48, png: await renderIcon(48, 11, 9) },
  ]))
  await browser.close()
  console.log(`wrote ${CARDS.length} cards, the icons and favicon.ico`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
