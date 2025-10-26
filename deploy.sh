#!/bin/bash
# deploy.sh - Deploy Sphinx Focus to GitHub Pages

set -e  # Exit on error

echo "🚀 Starting deployment to GitHub Pages..."

# Ensure we're on main branch
echo "📌 Ensuring we're on main branch..."
git checkout main

# Build the project
echo "🔨 Building project..."
npm run build

# Switch to gh-pages
echo "🔀 Switching to gh-pages branch..."
git checkout gh-pages

# Copy built files from main branch
echo "📋 Copying built files from main branch..."
git show main:index.html > index.html
git show main:styles.css > styles.css
git show main:app.js > app.js
git show main:favicon.ico > favicon.ico

# Copy directories using checkout
echo "📁 Copying directories..."
git checkout main -- fonts/ media/ services/ 2>/dev/null || true

# Add and commit
echo "💾 Committing changes..."
git add index.html styles.css app.js favicon.ico fonts/ media/ services/
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin gh-pages

# Return to main
echo "🔙 Returning to main branch..."
git checkout main

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your site will be updated at: https://nostromo-618.github.io/sphinx-focus/"
echo "⏱️  GitHub Pages may take a few minutes to reflect the changes."