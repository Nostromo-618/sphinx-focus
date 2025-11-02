# Deployment Guide - GitHub Pages

---

## Branching Strategy

### Branch Types and Rules

#### `main` - Stable Production Branch
- **Purpose:** Holds the latest stable, production-ready code
- **Rules:**
  - ✅ Only merge tested, working code
  - ❌ No experimental or non-working code
  - ❌ No direct development (use feature/bugfix branches)
  - ✅ Source for all deployments to gh-pages

#### `gh-pages` - Deployment Branch
- **Purpose:** Serves the live application via GitHub Pages
- **Rules:**
  - ✅ Contains only built, optimized production code
  - ✅ Serves from root directory (/)
  - ❌ Never develop or commit directly to this branch
  - ✅ Updated only via deploy.sh script from main

#### `dev-feat-FeatureName-YYYY-MM-DD` - Feature Branches
- **Purpose:** Develop new features in isolation
- **Naming:** `dev-feat-<FeatureName>-<YYYY-MM-DD>`
- **Examples:**
  - `dev-feat-TaskManager-2025-11-02`
  - `dev-feat-DarkMode-2025-11-15`
  - `dev-feat-Statistics-2025-12-01`
- **Lifecycle:**
  1. Create from main: `git checkout main && git checkout -b dev-feat-TaskManager-2025-11-02`
  2. Develop and test locally
  3. Merge to main when stable
  4. **Delete after successful merge** (required)

#### `dev-fix-BugFixPackName-YYYY-MM-DD` - Bugfix Branches
- **Purpose:** Fix bugs in isolation
- **Naming:** `dev-fix-<BugFixPackName>-<YYYY-MM-DD>`
- **Examples:**
  - `dev-fix-TimerReset-2025-11-02`
  - `dev-fix-ThemeSwitcher-2025-11-15`
  - `dev-fix-DataExport-2025-12-01`
- **Lifecycle:**
  1. Create from main: `git checkout main && git checkout -b dev-fix-TimerReset-2025-11-02`
  2. Fix and test locally
  3. Merge to main when verified
  4. **Delete after successful merge** (required)

### Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Create Feature/Bugfix Branch from main                   │
│    git checkout main                                         │
│    git checkout -b dev-feat-FeatureName-YYYY-MM-DD          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Develop and Test Locally                                 │
│    npm run dev    (development server)                      │
│    npm run build  (test build)                              │
│    npm run serve  (test built version)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Merge to main                                            │
│    git checkout main                                         │
│    git merge dev-feat-FeatureName-YYYY-MM-DD                │
│    git push origin main                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Deploy to gh-pages                                       │
│    ./deploy.sh                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Delete Feature/Bugfix Branch (REQUIRED)                 │
│    git branch -d dev-feat-FeatureName-YYYY-MM-DD           │
│    git push origin --delete dev-feat-FeatureName-YYYY-MM-DD│
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Deploy

**The easiest way to deploy from main branch:**

```bash
./deploy.sh
```

That's it! The script handles everything automatically.

---

## Overview

The project uses a structured branching workflow:

- **`main`** - Stable production branch
  - Contains only tested, working code
  - Source for all deployments
  - Receives merges from feature/bugfix branches only
  
- **`gh-pages`** - Deployment branch
  - Serves the built site on GitHub Pages
  - Updated only via deploy.sh script
  - Contains optimized production code only

- **`dev-feat-*`** - Feature development branches
  - Created from main for new features
  - Tested locally before merging
  - Deleted after successful merge

- **`dev-fix-*`** - Bugfix branches
  - Created from main for bug fixes
  - Tested locally before merging
  - Deleted after successful merge

**Important:** Never develop directly on main or gh-pages. Always use feature/bugfix branches.

## GitHub Pages Setup

GitHub Pages is configured to deploy from:
- **Branch:** `gh-pages`
- **Folder:** `/ (root)`
- **URL:** https://nostromo-618.github.io/sphinx-focus/

---

## Development Workflow

### Creating a Feature Branch

1. **Ensure main is up to date:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**
   ```bash
   # Format: dev-feat-<FeatureName>-<YYYY-MM-DD>
   git checkout -b dev-feat-TaskManager-2025-11-02
   ```

3. **Develop your feature:**
   - Make your code changes
   - Test frequently with `npm run dev`
   - Commit regularly with clear messages

### Creating a Bugfix Branch

1. **Ensure main is up to date:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create bugfix branch:**
   ```bash
   # Format: dev-fix-<BugFixPackName>-<YYYY-MM-DD>
   git checkout -b dev-fix-TimerReset-2025-11-02
   ```

3. **Fix the bug:**
   - Make your fixes
   - Test thoroughly
   - Commit with descriptive messages

### Testing Locally

**Before merging to main, always test your changes:**

1. **Test development version:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and verify your changes work correctly.

2. **Test built version:**
   ```bash
   npm run build
   npm run serve
   ```
   Open http://localhost:8080 and verify the built version works correctly.

3. **Verify all functionality:**
   - Test the specific feature/fix
   - Test related functionality
   - Test in different browsers if possible
   - Check console for errors

### Merging to Main

**Only merge when your feature/fix is fully tested and working:**

1. **Switch to main and update:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Merge your branch:**
   ```bash
   # For feature branch
   git merge dev-feat-TaskManager-2025-11-02
   
   # For bugfix branch
   git merge dev-fix-TimerReset-2025-11-02
   ```

3. **Resolve conflicts if any:**
   - Fix merge conflicts carefully
   - Test again after resolving conflicts
   - Commit the merge

4. **Push to GitHub:**
   ```bash
   git push origin main
   ```

### Deploying to Production

**After successful merge to main:**

1. **Run the deploy script:**
   ```bash
   ./deploy.sh
   ```

2. **Verify deployment:**
   - Wait 2-5 minutes for GitHub Pages to update
   - Visit https://nostromo-618.github.io/sphinx-focus/
   - Test the deployed version

### Branch Cleanup (REQUIRED)

**After successful merge and deployment, delete the feature/bugfix branch:**

1. **Delete local branch:**
   ```bash
   # For feature branch
   git branch -d dev-feat-TaskManager-2025-11-02
   
   # For bugfix branch
   git branch -d dev-fix-TimerReset-2025-11-02
   ```

2. **Delete remote branch:**
   ```bash
   # For feature branch
   git push origin --delete dev-feat-TaskManager-2025-11-02
   
   # For bugfix branch
   git push origin --delete dev-fix-TimerReset-2025-11-02
   ```

**Note:** Branch cleanup is required to keep the repository organized and prevent branch clutter.

---

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
4. 📋 Copy all built files to root (index.html, styles.css, app.js, favicon.ico, fonts/, media/, services/)
5. 🧹 Remove development files (package.json, node_modules, tests, docs, etc.) - keeps only runtime files
6. 💾 Commit changes with timestamp
7. ⬆️ Push to GitHub
8. 🔙 Return to main branch

**Note:** The deploy script is already executable. If you need to make it executable again:
```bash
chmod +x deploy.sh
```

**Important:** The deploy script only works from the main branch. If you're on a feature/bugfix branch, merge to main first, then deploy.

### Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Ensure you're on main and build
git checkout main
npm run build

# 2. Switch to gh-pages
git checkout gh-pages

# 3. Copy ALL built files from main branch to root
git show main:index.html > index.html
git show main:styles.css > styles.css
git show main:app.js > app.js
git show main:favicon.ico > favicon.ico
git checkout main -- fonts/ media/ services/

# 4. Commit and push
git add index.html styles.css app.js favicon.ico fonts/ media/ services/
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin gh-pages

# 5. Return to main
git checkout main
```

**Important:** You MUST copy files to the ROOT of gh-pages branch, not keep them in dist/. GitHub Pages serves from the root directory.

---

## Available NPM Scripts

- `npm run build` - Build the project (clean + copy files to dist/)
- `npm run clean` - Remove the dist/ directory
- `npm run copy` - Copy source files to dist/
- `npm run serve` - Serve the built files from dist/ on port 8080
- `npm run dev` - Serve the source files directly on port 3000

---

## Testing Before Deployment

### Testing on Feature/Bugfix Branches

Before merging to main, test your changes locally:

```bash
# On your feature/bugfix branch
npm run dev
```

Open http://localhost:3000 to preview without building.

Test the built version:

```bash
npm run build
npm run serve
```

Open http://localhost:8080 to preview the built version.

### Testing After Merge to Main

After merging to main, test again before deploying:

```bash
# On main branch
npm run build
npm run serve
```

Open http://localhost:8080 to verify the built version.

### Testing After Deployment

After running `./deploy.sh`:
- Wait 2-5 minutes for GitHub Pages to update
- Visit https://nostromo-618.github.io/sphinx-focus/
- Test all functionality in the live environment

---

## Important Notes

1. **Never develop directly on main** - Always use feature/bugfix branches
2. **Never develop in gh-pages** - This branch should only contain deployed files
3. **Always test before merging** - Test locally on your branch before merging to main
4. **Always build before deploying** - The deploy script does this automatically
5. **Branch cleanup is required** - Delete feature/bugfix branches after successful merge
6. **The dist/ folder is gitignored** - It won't be committed to the main branch
7. **⚠️ CRITICAL: Files must be in ROOT of gh-pages** - GitHub Pages serves from `/`, not `/dist/`
8. **All assets must be copied** - Don't forget favicon.ico, fonts/, media/, and services/
9. **Deploy only from main** - The deploy.sh script enforces this requirement

---

## Troubleshooting

### Changes not appearing on GitHub Pages

**Most common issue:** Files were only updated in `dist/` but not copied to the ROOT of gh-pages branch.

**Solution:**
```bash
git checkout gh-pages
# Verify files are in root, not in dist/
ls -la index.html styles.css app.js favicon.ico
# If they're missing or outdated, copy from main
git show main:index.html > index.html
git show main:styles.css > styles.css
git show main:app.js > app.js
git show main:favicon.ico > favicon.ico
git checkout main -- fonts/ media/ services/
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
- Verify the build includes: `index.html`, `styles.css`, `app.js`, `favicon.ico`, `fonts/`, `media/`, `services/` (development files like package.json, tests/, etc. are automatically removed during deployment)

### Deploy script issues

If `./deploy.sh` doesn't work:
```bash
chmod +x deploy.sh
./deploy.sh
```

**Deploy script fails with "not on main branch":**
```bash
# Check current branch
git branch

# Switch to main
git checkout main

# Run deploy script
./deploy.sh
```

### Branch-related issues

**Failed merge to main:**
```bash
# If merge fails, abort and fix conflicts
git merge --abort

# Review conflicts
git status

# Fix conflicts in your feature/bugfix branch
git checkout dev-feat-TaskManager-2025-11-02
# Make necessary changes
git add .
git commit -m "Fix merge conflicts"

# Try merge again
git checkout main
git merge dev-feat-TaskManager-2025-11-02
```

**Forgot to delete branch:**
```bash
# List all branches
git branch -a

# Delete local branch
git branch -d dev-feat-OldFeature-2025-10-01

# Delete remote branch
git push origin --delete dev-feat-OldFeature-2025-10-01
```

**Need to switch branches but have uncommitted changes:**
```bash
# Stash your changes
git stash

# Switch branches
git checkout main

# Later, return and restore changes
git checkout dev-feat-TaskManager-2025-11-02
git stash pop
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
- `services/` - Encryption and storage services

**Deployed files (gh-pages branch ROOT):**
- All of the above files, copied from main after building

---

**Current Branches:**
- `main` - Stable production code (merge feature/bugfix branches here)
- `gh-pages` - Production deployment (updated via deploy.sh)
- `dev-feat-*` - Feature development branches (create, develop, merge, delete)
- `dev-fix-*` - Bugfix branches (create, fix, merge, delete)