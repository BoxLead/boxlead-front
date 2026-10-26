import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { APP_SHELL_FILE, NOT_FOUND_FILE } from './staticSite'

export type RouteFiles = { scripts: string[]; styles: string[] }

type PublicPage = {
  path: string
  title: string
  index: boolean
  source: string
  changefreq?: string
  priority?: number
}

type ServerEntry = {
  render: (url: string) => Promise<string>
  PUBLIC_PAGES: PublicPage[]
  NOT_FOUND_PAGE: PublicPage
  APP_SHELL_PATH: string
}

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

function assemble(template: string, head: string, body: string): string {
  const cleaned = template.replace(TEMPLATE_HEAD, '')
  const withHead = cleaned.replace('</head>', `    ${head}\n  </head>`)
  if (!withHead.includes(ROOT_OPEN)) throw new Error('The template has no empty root element')
  return withHead.replace(ROOT_OPEN, `<div id="root">${body}</div>`)
}

export function lastModified(root: string, source: string): string {
  if (!existsSync(join(root, '.git'))) return new Date().toISOString()
  try {
    const stamp = execFileSync('git', ['log', '-1', '--format=%cI', '--', source], { cwd: root, encoding: 'utf8' }).trim()
    return stamp === '' ? new Date().toISOString() : stamp
  } catch {
    return new Date().toISOString()
  }
}

export async function prerenderSite({ outDir, serverDir, base, routes }: PrerenderOptions): Promise<string[]> {
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
    write(fileFor(page.path), assemble(template, `${head}\n    ${routeLinks(base, routes[page.path])}`, body))
  }

  const notFound = splitRendered(await entry.render('/__not_found__'))
  write(NOT_FOUND_FILE, assemble(template, notFound.head, notFound.body))

  const shell = splitRendered(await entry.render(entry.APP_SHELL_PATH))
  write(APP_SHELL_FILE, assemble(template, shell.head, shell.body))

  rmSync(serverDir, { recursive: true, force: true })
  return written
}
