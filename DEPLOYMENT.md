# Deployment Guide - GitHub Pages

This document explains how to deploy Sphinx Focus to GitHub Pages.

## Quick Deploy

**The easiest way to deploy:**

```bash
./deploy.sh
```

That's it! The script handles everything automatically.

---

## Overview

The project uses a two-branch workflow:
- **`main`** - Development branch where all code changes are made
- **`gh-pages`** - Deployment branch that serves the built site on GitHub Pages

## GitHub Pages Setup

GitHub Pages is configured to deploy from:
- **Branch:** `gh-pages`
- **Folder:** `/ (root)`
- **URL:** https://nostromo-618.github.io/sphinx-focus/

## Deployment Workflow

### Automated Deployment (Recommended)

Use the provided deployment script:

```bash
./deploy.sh
```

The script will:
1. ✅ Ensure you're on the main branch
2. 🔨 Build the project (`npm run build`)
3. 🔀 Switch to gh-pages branch
4. 📋 Copy all built files to root (index.html, styles.css, app.js, favicon.ico, fonts/, media/)
5. 💾 Commit changes with timestamp
6. ⬆️ Push to GitHub
7. 🔙 Return to main branch

**Note:** The deploy script is already executable. If you need to make it executable again:
```bash
chmod +x deploy.sh
```

### Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Ensure you're on main and build
git checkout main
npm run build

# 2. Switch to gh-pages
git checkout gh-pages

# 3. Copy ALL built files from dist/ to root
cp dist/index.html dist/styles.css dist/app.js dist/favicon.ico .
cp -r dist/fonts dist/media .

# 4. Commit and push
git add index.html styles.css app.js favicon.ico fonts/ media/
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin gh-pages

# 5. Return to main
git checkout main
```

**Important:** You MUST copy files to the ROOT of gh-pages branch, not keep them in dist/. GitHub Pages serves from the root directory.

## Available NPM Scripts

- `npm run build` - Build the project (clean + copy files to dist/)
- `npm run clean` - Remove the dist/ directory
- `npm run copy` - Copy source files to dist/
- `npm run serve` - Serve the built files from dist/ on port 8080
- `npm run dev` - Serve the source files directly on port 3000

## Testing Before Deployment

Before deploying, test the built version locally:

```bash
npm run build
npm run serve
```

Open http://localhost:8080 to preview the built version.

Or test the development version directly:

```bash
npm run dev
```

Open http://localhost:3000 to preview without building.

## Important Notes

1. **Never develop in gh-pages** - This branch should only contain deployed files
2. **Always build before deploying** - The deploy script does this automatically
3. **The dist/ folder is gitignored** - It won't be committed to the main branch
4. **⚠️ CRITICAL: Files must be in ROOT of gh-pages** - GitHub Pages serves from `/`, not `/dist/`
5. **All assets must be copied** - Don't forget favicon.ico, fonts/, and media/

## Troubleshooting

### Changes not appearing on GitHub Pages

**Most common issue:** Files were only updated in `dist/` but not copied to the ROOT of gh-pages branch.

**Solution:**
```bash
git checkout gh-pages
# Verify files are in root, not in dist/
ls -la index.html styles.css app.js favicon.ico
# If they're missing or outdated, copy from dist/
cp dist/* .
cp -r dist/fonts dist/media .
git add -A
git commit -m "Fix: Copy files to root"
git push origin gh-pages
git checkout main
```

**Other causes:**
- GitHub Pages may take 2-5 minutes to update
- Try a hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check your browser cache - try incognito/private mode
- Check the "Actions" tab on GitHub for deployment status

### Build issues

- Make sure all source files exist
- Run `npm run clean && npm run build` to start fresh
- Verify the build includes: `index.html`, `styles.css`, `app.js`, `favicon.ico`, `fonts/`, `media/`

### Deploy script issues

If `./deploy.sh` doesn't work:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Project Files

**Source files (main branch):**
- `index.html` - Main HTML file
- `styles.css` - Stylesheet with theme support
- `app.js` - Application logic
- `favicon.ico` - Site favicon
- `fonts/` - Ubuntu font files
- `media/` - Images (sphinx logo)

**Deployed files (gh-pages branch ROOT):**
- All of the above files, copied from `dist/` after building

---

**Current Branches:**
- `main` - Development (make all changes here)
- `gh-pages` - Production deployment (deploy script updates this)
- `gh-pages` - Production deployment