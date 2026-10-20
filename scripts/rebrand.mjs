// Applies Evan Archive branding to a fresh FMHY checkout before it is built.
//
// Only the site's identity changes (name, logo, footer, meta). The wiki content,
// licenses, edit links and feedback form are left pointing at FMHY, and the
// footer credits it. Every edit is a plain text match: if upstream rewrites a
// line, that edit is skipped with a warning and the build still succeeds.
//
// Usage: node scripts/rebrand.mjs <path-to-fmhy-checkout>

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2]
if (!target) {
  console.error('usage: node scripts/rebrand.mjs <fmhy-checkout>')
  process.exit(1)
}

const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.json'), 'utf8'))
const vp = path.join(target, 'docs/.vitepress')
const pub = path.join(target, 'docs/public')
const missed = []

function edit(file, replacements) {
  const full = path.join(target, file)
  let text = fs.readFileSync(full, 'utf8')
  for (const [from, to] of replacements) {
    const next = text.replace(from, to)
    if (next === text) missed.push(`${file}: ${from}`)
    text = next
  }
  fs.writeFileSync(full, text)
}

edit('docs/.vitepress/config.mts', [
  ["title: 'FMHY'", `title: '${brand.name}'`],
  [':title • freemediaheckyeah', `:title • ${brand.name}`],
  ["title: 'FMHY RSS Feed'", `title: '${brand.name} RSS Feed'`],
  ["alt: 'FMHY Logo'", `alt: '${brand.name} logo'`],
  [/content: '#7bc5e4'/, `content: '${brand.themeColor}'`],
  // These verify fmhy.net with Bing and Google; they don't belong on a mirror.
  [/\s*\/\/ Bing site verification\s*\[[^\]]*?msvalidate[\s\S]*?\],/, ''],
  [/\s*\/\/ Google site verification\s*\[[^\]]*?google-site-verification[\s\S]*?\],/, ''],
  [
    /copyright:\s*`[\s\S]*?This site does not host any files\.`/,
    'copyright:\n' +
      `        \`${brand.name} is an automatically updated mirror of <a href="https://fmhy.net">FMHY</a>.\` +\n` +
      '        `<br/> This site does not host any files.`'
  ]
])

edit('docs/.vitepress/shared.ts', [
  ["name: 'freemediaheckyeah'", `name: '${brand.name}'`],
  ["hostname: 'https://fmhy.net'", `hostname: '${brand.siteUrl}'`]
])

edit('docs/.vitepress/hooks/opengraph.ts', [
  ["text: 'freemediaheckyeah'", `text: '${brand.name}'`]
])

edit('docs/index.md', [
  [/^(\s*)name: freemediaheckyeah$/m, `$1name: ${brand.name}`],
  [/^(\s*)tagline: .*$/m, `$1tagline: ${brand.tagline}`],
  [/^(\s*)alt: FMHY Icon$/m, `$1alt: ${brand.name} icon`]
])

const manifestPath = path.join(pub, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.name = brand.name
manifest.short_name = brand.name
manifest.theme_color = brand.themeColor
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

// Swap the icon files in place so every existing reference picks them up.
const icons = [
  ['favicon.ico', 'fmhy.ico'],
  ['favicon.ico', 'favicon.ico'],
  ['icon-512.png', 'pwa_icon.png'],
  ['icon-512.png', 'test.png']
]
for (const [from, to] of icons) {
  fs.copyFileSync(path.join(root, 'brand', from), path.join(pub, to))
}

if (missed.length) {
  console.warn('rebrand: these upstream lines changed and were left as-is:')
  for (const m of missed) console.warn(`  - ${m}`)
}
console.log(`rebrand: applied ${brand.name} branding to ${target}`)
