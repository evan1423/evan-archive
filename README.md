# Evan Archive

An automatically updated, rebranded mirror of [FMHY](https://fmhy.net), hosted on Vercel.

All of the wiki content, site code and search come from FMHY's source repo,
[fmhy/edit](https://github.com/fmhy/edit). This repo holds no FMHY content. It only
holds the instructions for fetching, branding and building it. FMHY's license files
are kept in every build, and the site footer credits FMHY.

## How it stays up to date

1. `.github/workflows/sync.yml` runs every hour. If `fmhy/edit` has new commits, it
   writes the latest commit hash into `upstream.json` and pushes.
2. Vercel sees the push and runs `scripts/build.sh`, which:
   - clones `fmhy/edit` at that exact commit,
   - runs `scripts/rebrand.mjs` to swap in the Evan Archive name, icon and footer,
   - runs FMHY's own VitePress build and publishes `dist/`.

Because FMHY is fetched fresh on every build, upstream changes never cause merge
conflicts here. If FMHY rewrites a line the rebrand script looks for, the build still
succeeds; that one edit is skipped and listed under `rebrand:` in the Vercel build log.

## Common tasks

| Task | How |
| --- | --- |
| Pull FMHY right now | Actions tab → **Sync with FMHY** → **Run workflow** |
| Change the name, tagline, URL or theme color | Edit `brand.json` and push |
| Change the icon | Edit `scripts/make-icons.py`, run `python3 scripts/make-icons.py`, push |
| Build locally | `npm run build`, then `npm run preview` |
| Stop auto-updates | Actions tab → **Sync with FMHY** → **⋯** → **Disable workflow** |
