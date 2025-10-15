# Deployment Guide - GitHub Pages

This document explains how to deploy Sphinx Focus to GitHub Pages.

## Overview

The project uses a two-branch workflow:
- **`main`** - Development branch where all code changes are made
- **`gh-pages`** - Deployment branch that serves the built site on GitHub Pages

## Initial Setup (Already Done)

The gh-pages branch has been created and pushed to GitHub. To enable GitHub Pages:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Source", select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. Click **Save**

Your site will be available at: `https://nostromo-618.github.io/sphinx-focus/`

## Deployment Workflow

### Step 1: Develop in main branch

Make all your changes in the `main` branch:

```bash
# Ensure you're on main branch
git checkout main

# Make your changes to index.html, app.js, styles.css, etc.
# ... edit files ...

# Commit your changes
git add .
git commit -m "Your commit message"
git push origin main
```

### Step 2: Build the project

Run the build script to create the `dist/` folder:

```bash
npm run build
```

This will:
1. Clean the `dist/` directory
2. Copy [`index.html`](index.html:1), [`styles.css`](styles.css:1), and [`app.js`](app.js:1) to `dist/`

### Step 3: Deploy to gh-pages

Switch to the gh-pages branch and copy the built files:

```bash
# Switch to gh-pages branch
git checkout gh-pages

# Copy built files from dist/ to root
cp dist/* .

# Commit the changes
git add index.html styles.css app.js
git commit -m "Deploy: update from main"

# Push to GitHub
git push origin gh-pages

# Switch back to main branch
git checkout main
```

### Complete Deployment Script

Here's a complete bash script you can save and run:

```bash
#!/bin/bash
# deploy.sh - Deploy to GitHub Pages

# Ensure we're on main branch
git checkout main

# Build the project
npm run build

# Switch to gh-pages
git checkout gh-pages

# Copy built files
cp dist/* .

# Add and commit
git add index.html styles.css app.js
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to GitHub
git push origin gh-pages

# Return to main
git checkout main

echo "✅ Deployment complete!"
echo "🌐 Your site will be updated at: https://nostromo-618.github.io/sphinx-focus/"
```

To use this script:

```bash
# Make it executable
chmod +x deploy.sh

# Run it
./deploy.sh
```

## Available NPM Scripts

- `npm run build` - Build the project (clean + copy files to dist/)
- `npm run clean` - Remove the dist/ directory
- `npm run copy` - Copy source files to dist/
- `npm run serve` - Serve the built files from dist/ on port 8080
- `npm run dev` - Serve the source files directly on port 3000

## Testing Before Deployment

Before deploying, you can test the built version locally:

```bash
# Build the project
npm run build

# Serve the dist folder
npm run serve
```

Then open http://localhost:8080 in your browser to test the built version.

## Important Notes

1. **Never develop in gh-pages** - This branch should only contain deployed files
2. **Always build before deploying** - Run `npm run build` to ensure you have the latest changes
3. **The dist/ folder is gitignored** - It won't be committed to the main branch
4. **GitHub Pages serves from root** - The built files are copied to the root of gh-pages branch

## Troubleshooting

### Changes not appearing on GitHub Pages

- GitHub Pages may take a few minutes to update
- Check the Actions tab on GitHub for deployment status
- Ensure you pushed to the gh-pages branch, not main

### Build issues

- Make sure all source files exist: [`index.html`](index.html:1), [`styles.css`](styles.css:1), [`app.js`](app.js:1)
- Run `npm run clean` and then `npm run build` to start fresh

### Branch confusion

- Use `git branch` to check which branch you're on
- Always commit changes to main, then deploy to gh-pages
- Never merge gh-pages into main or vice versa

## Automated Deployment (Future Enhancement)

Consider setting up GitHub Actions to automate deployment:
- Create `.github/workflows/deploy.yml`
- Auto-deploy when pushing to main
- No manual branch switching required

---

**Current Branches:**
- `main` - Development (you are here)
- `gh-pages` - Production deployment