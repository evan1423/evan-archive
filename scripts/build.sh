#!/usr/bin/env bash
# Builds Evan Archive: fetches FMHY at the commit pinned in upstream.json,
# applies the branding in brand.json, and writes the static site to dist/.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
repo="$(node -p "require('$root/upstream.json').repo")"
sha="$(node -p "require('$root/upstream.json').sha")"
work="$root/.upstream"

rm -rf "$work" "$root/dist"

# generate-removed.js reads the last 30 days of git log, so fetch a bit more than that.
git clone --quiet --shallow-since="45 days ago" "https://github.com/$repo.git" "$work"
if ! git -C "$work" checkout --quiet "$sha" 2>/dev/null; then
  git -C "$work" fetch --quiet --depth=1 origin "$sha"
  git -C "$work" checkout --quiet "$sha"
fi
echo "build: $repo @ $sha"

node "$root/scripts/rebrand.mjs" "$work"

cd "$work"
pnpm="pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"
# Keep the pnpm store inside node_modules/ so Vercel's build cache carries it between deploys.
npx --yes "$pnpm" install --frozen-lockfile --store-dir "$root/node_modules/.pnpm-store"
COMMIT_REF="$sha" npx --yes "$pnpm" docs:build

mv docs/.vitepress/dist "$root/dist"
