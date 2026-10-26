import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { preview } from 'vite'

type Check = { name: string; ok: boolean; detail?: string }

const checks: Check[] = []

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail })
}

function count(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length
}

function attr(html: string, pattern: RegExp): string | null {
  const match = pattern.exec(html)
  return match ? match[1] : null
}

async function main() {
  const root = process.cwd()
  const server = await preview({ root, preview: { port: 0, strictPort: false, open: false }, logLevel: 'silent' })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('No preview address')
  const base = `http://localhost:${address.port}`

  const sitemap = readFileSync(resolve(root, 'dist/sitemap.xml'), 'utf8')
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  check('sitemap lists pages with lastmod', sitemapUrls.length > 0 && count(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}/g) === sitemapUrls.length)
  check('robots blocks the app and points to the sitemap', /Disallow: \/app/.test(readFileSync(resolve(root, 'dist/robots.txt'), 'utf8')) && /Sitemap: https:\/\/boxlead\.app\/sitemap\.xml/.test(readFileSync(resolve(root, 'dist/robots.txt'), 'utf8')))
  check('llms.txt exists', readFileSync(resolve(root, 'dist/llms.txt'), 'utf8').startsWith('# BoxLead'))

  const seen = new Map<string, string>()
  for (const url of sitemapUrls) {
    const path = new URL(url).pathname
    const response = await fetch(`${base}${path}`)
    const html = await response.text()
    const title = attr(html, /<title>([^<]*)<\/title>/)
    const description = attr(html, /<meta name="description" content="([^"]*)"/)
    const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/)
    const h1s = count(html, /<h1[\s>]/g)
    const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1])
    let graphOk = graph.length > 0
    for (const json of graph) {
      try {
        const parsed = JSON.parse(json) as { '@context'?: string; '@graph'?: { '@type'?: string }[] }
        graphOk &&= parsed['@context'] === 'https://schema.org' && (parsed['@graph'] ?? []).every((node) => typeof node['@type'] === 'string')
      } catch {
        graphOk = false
      }
    }
    check(`${path} answers 200`, response.status === 200, String(response.status))
    check(`${path} has one h1`, h1s === 1, `${h1s} h1`)
    check(`${path} has its own title`, Boolean(title) && count(html, /<title>/g) === 1 && !seen.has(`title:${title}`), title ?? 'missing')
    check(`${path} has its own description`, Boolean(description) && !seen.has(`description:${description}`), description ?? 'missing')
    check(`${path} declares its canonical`, canonical === url, canonical ?? 'missing')
    check(`${path} has Open Graph and Twitter tags`, /property="og:title"/.test(html) && /property="og:image"/.test(html) && /name="twitter:card" content="summary_large_image"/.test(html))
    check(`${path} has valid JSON-LD`, graphOk)
    check(`${path} is not noindex`, !/name="robots" content="noindex"/.test(html))
    seen.set(`title:${title}`, path)
    seen.set(`description:${description}`, path)
  }

  for (const path of ['/login', '/register', '/arrepentimiento', '/baja', '/invitacion', '/social/callback', '/app/inbox', '/app']) {
    const response = await fetch(`${base}${path}`)
    const html = await response.text()
    check(`${path} is noindex`, response.status === 200 && /name="robots" content="noindex"/.test(html) && count(html, /<title>/g) === 1, String(response.status))
    check(`${path} is out of the sitemap`, !sitemapUrls.includes(`https://boxlead.app${path}`))
  }

  const missing = await fetch(`${base}/esto-no-existe`)
  check('an unknown path answers 404 with the 404 page', missing.status === 404 && /No encontramos esta página/.test(await missing.text()), String(missing.status))
  const deep = await fetch(`${base}/privacidad/extra`)
  check('an unknown nested path answers 404', deep.status === 404, String(deep.status))
  for (const [from, to] of [['/privacidad/', '/privacidad'], ['/index.html', '/'], ['/terminos.html', '/terminos']]) {
    const response = await fetch(`${base}${from}`, { redirect: 'manual' })
    check(`${from} redirects to ${to} with 301`, response.status === 301 && response.headers.get('location') === to, `${response.status} ${response.headers.get('location')}`)
  }

  await server.close()
  const failed = checks.filter((item) => !item.ok)
  for (const item of checks) console.log(`${item.ok ? 'ok ' : 'FAIL'} ${item.name}${item.ok || !item.detail ? '' : ` (${item.detail})`}`)
  console.log(`${checks.length - failed.length} of ${checks.length} checks passed`)
  if (failed.length > 0) process.exit(1)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
