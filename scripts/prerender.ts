import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { APP_SHELL_FILE, NOT_FOUND_FILE } from './staticSite'

export type RouteFiles = { scripts: string[]; styles: string[] }

type PublicPage = {
  path: string
  title: string
  lang: string
  index: boolean
  source: string
  changefreq?: string
  priority?: number
}

type SitemapEntry = { page: PublicPage; lastmod: string }

type ServerEntry = {
  render: (url: string) => Promise<string>
  noscriptText: (lang: string) => string
  PUBLIC_PAGES: PublicPage[]
  NOT_FOUND_PAGE: PublicPage
  APP_SHELL_PATH: string
  indexablePages: () => PublicPage[]
  buildSitemap: (entries: SitemapEntry[]) => string
  buildRobots: () => string
  buildLlms: () => string
}

const LASTMOD_FILE = 'lastmod.txt'


type PrerenderOptions = {
  root: string
  outDir: string
  serverDir: string
  base: string
  routes: Record<string, RouteFiles>
}

const HEAD_TAG = /^(?:<title>[^<]*<\/title>|<meta [^>]*\/?>|<link [^>]*\/?>)/
const ROOT_OPEN = '<div id="root"></div>'
const TEMPLATE_HEAD = /\s*<(?:title>[^<]*<\/title|meta name="(?:description|robots)"[^>]*\/?|link rel="canonical"[^>]*\/?)>/g

function splitRendered(html: string): { head: string; body: string } {
  let head = ''
  let rest = html
  for (;;) {
    const match = HEAD_TAG.exec(rest)
    if (!match) break
    head += match[0]
    rest = rest.slice(match[0].length)
  }
  return { head, body: rest }
}

function routeLinks(base: string, files: RouteFiles | undefined): string {
  if (!files) return ''
  const styles = files.styles.map((file) => `<link rel="stylesheet" crossorigin href="${base}${file}">`)
  const scripts = files.scripts.map((file) => `<link rel="modulepreload" crossorigin href="${base}${file}">`)
  return [...styles, ...scripts].join('\n    ')
}

function fileFor(path: string): string {
  return path === '/' ? 'index.html' : `${path.slice(1)}.html`
}

const HTML_LANG = /<html lang="[^"]*">/
const NOSCRIPT = /<noscript>[^<]*<\/noscript>/

function assemble(template: string, head: string, body: string, lang: string, noscript: string): string {
  if (!HTML_LANG.test(template)) throw new Error('The template has no html lang attribute')
  if (!NOSCRIPT.test(template)) throw new Error('The template has no noscript notice')
  const cleaned = template
    .replace(TEMPLATE_HEAD, '')
    .replace(HTML_LANG, `<html lang="${lang}">`)
    .replace(NOSCRIPT, `<noscript>${noscript}</noscript>`)
  const withHead = cleaned.replace('</head>', `    ${head}\n  </head>`)
  if (!withHead.includes(ROOT_OPEN)) throw new Error('The template has no empty root element')
  return withHead.replace(ROOT_OPEN, `<div id="root">${body}</div>`)
}

function recordedDates(root: string): Map<string, string> {
  const file = join(root, LASTMOD_FILE)
  const dates = new Map<string, string>()
  if (!existsSync(file)) return dates
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [stamp, path] = line.split('\t')
    if (stamp && path) dates.set(path, stamp)
  }
  return dates
}

function gitDate(root: string, source: string): string | null {
  if (!existsSync(join(root, '.git'))) return null
  try {
    const stamp = execFileSync('git', ['log', '-1', '--format=%cI', '--', source], { cwd: root, encoding: 'utf8' }).trim()
    return stamp === '' ? null : stamp
  } catch {
    return null
  }
}

export function lastModified(root: string, source: string, recorded = recordedDates(root)): string {
  const prefix = source.endsWith('/') ? source : `${source}/`
  const stamps = [...recorded.entries()].filter(([path]) => path === source || path.startsWith(prefix)).map(([, stamp]) => stamp)
  if (stamps.length > 0) return stamps.sort().at(-1) as string
  return gitDate(root, source) ?? new Date().toISOString()
}

export async function prerenderSite({ root, outDir, serverDir, base, routes }: PrerenderOptions): Promise<string[]> {
  const entry = (await import(pathToFileURL(join(serverDir, 'entry-server.js')).href)) as ServerEntry
  const template = readFileSync(join(outDir, 'index.html'), 'utf8')
  const written: string[] = []

  const write = (file: string, html: string) => {
    const target = join(outDir, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, html)
    written.push(file)
  }

  for (const page of entry.PUBLIC_PAGES) {
    const rendered = await entry.render(page.path)
    const { head, body } = splitRendered(rendered)
    if (!head.includes('<title>')) throw new Error(`No title rendered for ${page.path}`)
    if (!body.startsWith('<')) throw new Error(`Unexpected markup for ${page.path}`)
    write(fileFor(page.path), assemble(template, `${head}\n    ${routeLinks(base, routes[page.path])}`, body, page.lang, entry.noscriptText(page.lang)))
  }

  const notFound = splitRendered(await entry.render('/__not_found__'))
  write(NOT_FOUND_FILE, assemble(template, notFound.head, notFound.body, entry.NOT_FOUND_PAGE.lang, entry.noscriptText(entry.NOT_FOUND_PAGE.lang)))

  const shell = splitRendered(await entry.render(entry.APP_SHELL_PATH))
  write(APP_SHELL_FILE, assemble(template, shell.head, shell.body, entry.NOT_FOUND_PAGE.lang, entry.noscriptText(entry.NOT_FOUND_PAGE.lang)))

  const recorded = recordedDates(root)
  const entries = entry.indexablePages().map((page) => ({ page, lastmod: lastModified(root, page.source, recorded) }))
  write('sitemap.xml', entry.buildSitemap(entries))
  write('robots.txt', entry.buildRobots())
  write('llms.txt', entry.buildLlms())

  rmSync(serverDir, { recursive: true, force: true })
  return written
}
