// Applies Evan Archive branding to a fresh FMHY checkout before it is built.
//
// Only the site's identity changes (name, logo, footer, meta). The wiki content,
// licenses, edit links and feedback form are left pointing at FMHY, and the
// footer credits it.
//
// Upstream edits these files often, so every edit is a text match that may stop
// matching one day. Critical edits (anything that would make the mirror present
// itself as FMHY, or keep FMHY's search-engine verification tags) fail with exit
// code 1, so Vercel keeps the last good deploy and the sync workflow alerts.
// Cosmetic edits only warn. A missing file counts as a miss, never a crash.
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
const pub = path.join(target, 'docs/public')
const warnings = []
const failures = []

// JSON string literals are valid TypeScript and valid YAML double-quoted scalars.
const lit = (value) => JSON.stringify(value)
// For text placed inside a JS template literal.
const tmpl = (value) => value.replace(/[\\`]/g, '\\$&').replace(/\$\{/g, '\\${')

function edit(file, replacements) {
  const full = path.join(target, file)
  let text
  try {
    text = fs.readFileSync(full, 'utf8')
  } catch {
    if (replacements.some((r) => r.critical)) failures.push(`${file}: file not found`)
    else if (replacements.some((r) => !r.optional)) warnings.push(`${file}: file not found`)
    return
  }
  for (const { from, to, critical, optional } of replacements) {
    const next = text.replace(from, typeof to === 'function' ? to : () => to)
    if (next === text && !optional) (critical ? failures : warnings).push(`${file}: no match for ${from}`)
    text = next
  }
  fs.writeFileSync(full, text)
}

edit('docs/.vitepress/config.mts', [
  { from: "title: 'FMHY'", to: `title: ${lit(brand.name)}`, critical: true },
  { from: "titleTemplate: ':title • freemediaheckyeah'", to: `titleTemplate: ${lit(`:title • ${brand.name}`)}`, critical: true },
  { from: "title: 'FMHY RSS Feed'", to: `title: ${lit(`${brand.name} RSS Feed`)}` },
  { from: "alt: 'FMHY Logo'", to: `alt: ${lit(`${brand.name} logo`)}` },
  { from: "content: '#7bc5e4'", to: `content: ${lit(brand.themeColor)}` },
  // These verify fmhy.net with Bing and Google and must not ship on a mirror.
  // A miss here is fine if upstream dropped them; the check below decides.
  {
    from: /\s*\/\/ Bing site verification\s*\[\s*'meta',\s*\{[^{}]*msvalidate[^{}]*\}\s*\],?/,
    to: '',
    optional: true
  },
  {
    from: /\s*\/\/ Google site verification\s*\[\s*'meta',\s*\{[^{}]*google-site-verification[^{}]*\}\s*\],?/,
    to: '',
    optional: true
  },
  {
    from: /copyright:\s*`[\s\S]*?This site does not host any files\.`/,
    to:
      'copyright:\n' +
      `        \`${tmpl(brand.name)} is an automatically updated mirror of <a href="https://fmhy.net">FMHY</a>.\` +\n` +
      '        `<br/> This site does not host any files.`'
  }
])

try {
  const config = fs.readFileSync(path.join(target, 'docs/.vitepress/config.mts'), 'utf8')
  if (/msvalidate|google-site-verification/.test(config)) {
    failures.push('docs/.vitepress/config.mts: FMHY site-verification tags are still present')
  }
} catch {
  // Already reported as a missing file above.
}

edit('docs/.vitepress/shared.ts', [
  { from: "name: 'freemediaheckyeah'", to: `name: ${lit(brand.name)}`, critical: true },
  { from: "hostname: 'https://fmhy.net'", to: `hostname: ${lit(brand.siteUrl)}`, critical: true }
])

edit('docs/.vitepress/hooks/opengraph.ts', [
  { from: "text: 'freemediaheckyeah'", to: `text: ${lit(brand.name)}` }
])

edit('docs/.vitepress/hooks/rss.ts', [
  { from: "title: 'FMHY blog'", to: `title: ${lit(brand.name)}` },
  { from: "image: 'https://github.com/fmhy.png'", to: `image: ${lit(`${brand.siteUrl}/pwa_icon.png`)}` }
])

edit('docs/.vitepress/theme/index.ts', [
  // The theme re-applies its own theme colour after load, outside October.
  { from: ": '#7bc5e4'", to: `: ${lit(brand.themeColor)}` }
])

edit('docs/index.md', [
  { from: /^([ \t]*)name: freemediaheckyeah$/m, to: (_, indent) => `${indent}name: ${lit(brand.name)}`, critical: true },
  // Also swallows continuation lines, in case upstream wraps the tagline.
  {
    from: /^([ \t]*)tagline:.*(?:\n\1[ \t]+\S.*)*$/m,
    to: (_, indent) => `${indent}tagline: ${lit(brand.tagline)}`
  },
  { from: /^([ \t]*)alt: FMHY Icon$/m, to: (_, indent) => `${indent}alt: ${lit(`${brand.name} icon`)}` }
])

try {
  const manifestPath = path.join(pub, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.name = brand.name
  manifest.short_name = brand.name
  manifest.theme_color = brand.themeColor
  // The install screenshot is an FMHY banner.
  delete manifest.screenshots
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
} catch (e) {
  warnings.push(`docs/public/manifest.json: ${e.message}`)
}

// Swap the logo files in place so every existing reference picks them up,
// including the seasonal logos (June, October, December) and the "uwu" easter egg.
const icons = [
  ['favicon.ico', 'fmhy.ico'],
  ['favicon.ico', 'favicon.ico'],
  ['icon-512.png', 'pwa_icon.png'],
  ['icon-512.png', 'test.png'],
  ['icon-512.png', 'hall.png'],
  ['icon-512.png', 'uwu-hall.png'],
  ['icon-512.png', 'xmasfmhy.png'],
  ['icon-512.webp', 'june_icon.webp'],
  ['logo.svg', 'logo-uwu.svg']
]
for (const [from, to] of icons) {
  try {
    fs.copyFileSync(path.join(root, 'brand', from), path.join(pub, to))
  } catch (e) {
    warnings.push(`docs/public/${to}: ${e.message}`)
  }
}

// In GitHub Actions these show up as annotations on the run summary.
const gha = process.env.GITHUB_ACTIONS === 'true'
for (const w of warnings) console.warn(gha ? `::warning title=rebrand::${w}` : `rebrand warning: ${w}`)
for (const f of failures) console.error(gha ? `::error title=rebrand::${f}` : `rebrand FAILED: ${f}`)

if (failures.length) {
  console.error('rebrand: upstream changed a line that keeps the mirror branded; update scripts/rebrand.mjs.')
  process.exit(1)
}
console.log(`rebrand: applied ${brand.name} branding to ${target} (${warnings.length} warning(s))`)
