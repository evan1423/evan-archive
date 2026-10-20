// Last line of defence after the build: refuses to publish a dist/ that would
// present the mirror as FMHY or carry FMHY's search-engine verification tags.
// A failed check fails the Vercel build, which keeps the previous deploy live.
//
// Usage: node scripts/check-dist.mjs <dist-dir>

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = process.argv[2]
const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.json'), 'utf8'))
const problems = []

const pages = fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith('.html'))
if (!pages.length) problems.push('no HTML pages were built')

for (const page of pages) {
  const html = fs.readFileSync(path.join(dist, page), 'utf8')
  if (/msvalidate\.01|google-site-verification/.test(html)) {
    problems.push(`${page}: FMHY site-verification meta tag`)
  }
}

const home = fs.existsSync(path.join(dist, 'index.html'))
  ? fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
  : ''
const title = home.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
if (!title.includes(brand.name)) problems.push(`index.html: <title> is "${title}", expected it to include "${brand.name}"`)

if (problems.length) {
  for (const p of problems) console.error(`check-dist FAILED: ${p}`)
  process.exit(1)
}
console.log(`check-dist: ${pages.length} pages OK`)
