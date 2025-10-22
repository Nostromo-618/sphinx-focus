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

# Copy built files
echo "📋 Copying built files..."
cp dist/index.html dist/styles.css dist/app.js dist/favicon.ico .
cp -r dist/fonts dist/media .

# Add and commit
echo "💾 Committing changes..."
git add index.html styles.css app.js favicon.ico fonts/ media/
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