#!/bin/bash

# Animedisk Stremio Addon - Setup Script for Replit
# Run this after uploading ZIP to Replit

echo "🚀 Setting up Animedisk Stremio Addon..."
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Make sure you're in the correct directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "🎬 Starting the addon server..."
    echo ""
    npm start
else
    echo ""
    echo "❌ Installation failed!"
    echo "Please check the error messages above."
    exit 1
fi
