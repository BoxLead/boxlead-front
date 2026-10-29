import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const COMMIT = /^[0-9a-f]{40}$/
const SHORT = 12

function commitOf(root: string): string | null {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    return COMMIT.test(sha) ? sha.slice(0, SHORT) : null
  } catch {
    return null
  }
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? filesUnder(path) : [path]
    })
}

function sourceHash(root: string): string {
  const hash = createHash('sha256')
  for (const file of [...filesUnder(join(root, 'src')), join(root, 'package-lock.json')]) {
    hash.update(relative(root, file))
    hash.update(readFileSync(file))
  }
  return hash.digest('hex').slice(0, SHORT)
}

export function releaseOf(root: string): string {
  const commit = commitOf(root)
  if (commit) return commit
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }
  return `${version}-${sourceHash(root)}`
}
