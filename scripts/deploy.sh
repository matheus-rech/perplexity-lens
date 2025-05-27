#!/bin/bash

# Perplexity Lens Deployment Script
# This script builds the extension and deploys it to Firebase hosting

set -e

echo "🚀 Starting Perplexity Lens deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the extension
echo "🔨 Building the extension..."
npm run build

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Check if view.html exists in dist
if [ ! -f "dist/view.html" ]; then
    echo "❌ view.html not found in dist directory"
    exit 1
fi

# Deploy to Firebase
echo "🌐 Deploying to Firebase..."
firebase deploy

# Get the hosting URL
PROJECT_ID=$(firebase use | grep "active project" | awk '{print $6}' | tr -d '()')
if [ -n "$PROJECT_ID" ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🔗 Your app is now live at: https://$PROJECT_ID.web.app"
    echo "📊 Shared graphs will be available at: https://$PROJECT_ID.web.app/view.html?id={graph-id}"
    echo ""
    echo "⚠️  Don't forget to:"
    echo "1. Update FIREBASE_HOSTING_URL in src/config.ts with your actual domain"
    echo "2. Rebuild and redeploy after updating the config"
else
    echo "✅ Deployment successful!"
    echo "🔗 Check the Firebase console for your hosting URL"
fi

echo ""
echo "🎉 Deployment complete!" 