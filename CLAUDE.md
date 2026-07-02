# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static bilingual (English / Japanese) marketing website for **Nojima International Co. Ltd.** (domain: `nojimaint.jp`). Plain HTML/CSS/JS — **no build step, no framework, no package.json, no tests, no linter.** What is in the repo is exactly what ships.

## Commands

- **Preview locally:** serve the repo root over HTTP so root-relative paths and the language redirect work, e.g. `python3 -m http.server 8000` then open `http://localhost:8000/`. Opening files via `file://` breaks the root redirect and asset paths.
- **Deploy:** automatic. `.github/workflows/main.yml` runs `wrangler pages deploy .` to Cloudflare Pages on every push to `main` **and on every pull request** (PRs produce preview deployments). There is no deploy command to run by hand.
  - Note the Cloudflare project name is `nojimint-website` (no "a") — intentional mismatch with the repo name `nojimaint-website`.

## Architecture

**Parallel language trees.** Every page exists twice with identical structure and translated content: `en/<page>.html` and `ja/<page>.html`. Pages: `index`, `services`, `car-sales`, `mobile-career`, `real-estate`, `company`, `contact`, `recruitment`, `privacy-policy`. **When you change one language's page, apply the equivalent change to its counterpart** unless the change is genuinely language-specific.

**Root redirect.** `/index.html` is a language dispatcher, not content. Inline script reads `localStorage.nojima_lang`, falls back to `navigator.language`, and redirects to `en/` or `ja/` (with a `<meta http-equiv="refresh">` no-JS fallback). `assets/js/main.js` seeds `nojima_lang` on first visit and updates it whenever a `.lang-btn` is clicked.

**Shared, hand-maintained assets** (there is no templating — header/nav/footer markup is duplicated in every page):
- `assets/css/style.css` — single stylesheet (~1050 lines). Organized into `/* ── Section ── */` blocks; all colors/radii/shadows are CSS custom properties in `:root`. Reuse the variables and existing section conventions rather than adding new ones.
- `assets/js/main.js` — single script, plain vanilla JS as independent IIFE modules (header scroll shadow, language persistence, mobile menu, form validation, file upload UX). No dependencies.
- Fonts are self-hosted (Inter woff2 + `Noto Sans JP`); no external font CDN.

## Forms (important — behavior lives in main.js)

Forms do **not** POST anywhere. On submit, `main.js` validates fields, builds a plain-text body from the labeled inputs, and opens the visitor's email client via a `mailto:` link. A form is wired up entirely through HTML attributes:

- `<form data-success-id="…" data-error-id="…" data-mailto="…">` — JS finds these; the mailto target defaults to `nojima.intc@gmail.com` if `data-mailto` is absent.
- Hidden `<input name="title">` supplies the email subject.
- Each field sits in a `.fg` wrapper; add `required`, `type="email"`/`type="tel"`, or `data-min-length="N"` and validation is automatic. Errors render as `.field-error` inside the `.fg`.
- `name="title"`, `name="privacy_agreed"`, and `name="cv"` are skipped in the email body (see `SKIP_KEYS`). The field `<label>` text becomes the line label, so keep labels meaningful.
- File uploads (`.file-upload-zone`) are UX-only (drag/drop preview, PDF/DOC/DOCX, 5 MB max); the file cannot travel via mailto, so a note tells the user to attach it manually.
- Validation and error messages are bilingual, keyed off `document.documentElement.lang === 'ja'`.

> Contact display address vs. mailto target differ by design: the site shows `info@nojimaint.jp`, but forms open `nojima.intc@gmail.com`. Don't "fix" this to match without checking.

## Per-page SEO (keep in sync when editing `<head>`)

Each page maintains its own: `<title>`, meta description, `<link rel="canonical">`, `hreflang` alternates (`en`, `ja`, `x-default`), Open Graph + Twitter tags, and (on `index`) JSON-LD structured data. `sitemap.xml` and `robots.txt` at the root list all pages — update `sitemap.xml` when adding or removing a page.

## Images

Bitmaps ship as `.webp` with a `.png` fallback (both referenced in `<picture>`/`<img>`). Unoptimized source files live in `assets/images/originals/` — edit those and re-export the optimized versions, don't overwrite the originals.
