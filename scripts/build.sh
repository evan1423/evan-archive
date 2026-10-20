#!/usr/bin/env bash
# Builds Evan Archive: fetches FMHY at the commit pinned in upstream.json,
# applies the branding in brand.json, and writes the static site to dist/.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
repo="$(node -p "require('$root/upstream.json').repo")"
sha="$(node -p "require('$root/upstream.json').sha")"
work="$root/.upstream"

rm -rf "$work" "$root/dist"

# Fetch only the pinned commit. FMHY's generate-removed.js deepens the history
# to the 30 days it needs on its own.
git init --quiet "$work"
git -C "$work" remote add origin "https://github.com/$repo.git"
git -C "$work" fetch --quiet --depth=1 --no-tags origin "$sha"
git -C "$work" checkout --quiet FETCH_HEAD
echo "build: $repo @ $sha"

node "$root/scripts/rebrand.mjs" "$work"

cd "$work"
pnpm="pnpm@$(node -p "(require('./package.json').packageManager || 'pnpm@10').split('@')[1].split('+')[0]")"
# Keep the pnpm store inside node_modules/ so Vercel's build cache carries it between deploys.
store="$root/node_modules/.pnpm-store"
npx --yes "$pnpm" install --frozen-lockfile --store-dir "$store"
COMMIT_REF="$sha" npx --yes "$pnpm" docs:build

mv docs/.vitepress/dist "$root/dist"
node "$root/scripts/check-dist.mjs" "$root/dist"

# Drop packages FMHY no longer uses, then the checkout, so the build cache stays small.
npx --yes "$pnpm" store prune --store-dir "$store" > /dev/null
cd "$root"
rm -rf "$work"
