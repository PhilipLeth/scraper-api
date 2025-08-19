#!/bin/bash

# Deployment script for scraper-api
echo "🚀 Deploying scraper-api..."

# Install Chrome for Puppeteer
echo "📦 Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Kill existing processes (if any)
echo "🔄 Stopping existing scraper processes..."
pkill -f "node index.js" || echo "No API server process found"
pkill -f "node queue-worker.js" || echo "No worker process found"

# Start the scraper with PM2 (if available) or nohup
if command -v pm2 &> /dev/null; then
    echo "🚀 Starting with PM2..."
    pm2 delete scraper-api 2>/dev/null || true
    pm2 delete scraper-worker 2>/dev/null || true
    pm2 start index.js --name scraper-api
    pm2 start queue-worker.js --name scraper-worker
    pm2 save
else
    echo "🚀 Starting with nohup..."
    nohup node index.js > scraper.log 2>&1 &
    echo $! > scraper.pid
    nohup node queue-worker.js > worker.log 2>&1 &
    echo $! > worker.pid
fi

echo "✅ Deployment complete!"
echo "🔍 Submit job with: curl http://localhost:3000/scrape?key=predicthire-scraper-2025&url=https://example.com"
echo "🔍 Check job status with: curl http://localhost:3000/status/1?key=predicthire-scraper-2025"
echo "🔍 Get job result with: curl http://localhost:3000/result/1?key=predicthire-scraper-2025"
