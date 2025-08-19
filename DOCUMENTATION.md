# Scraper API Documentation

## Overview

The Scraper API is an asynchronous web scraping service that uses a queue-based architecture to handle scraping requests efficiently. Instead of blocking HTTP requests while scraping pages, the API immediately returns a job ID and processes scraping requests in the background using a worker process.

## Architecture

### Components

1. **API Server** (`index.js`) - Express server handling HTTP requests
2. **Queue Worker** (`queue-worker.js`) - Background process that performs actual scraping
3. **SQLite Database** (`queue.db`) - Persistent job storage and queue management
4. **Deployment Script** (`deploy.sh`) - Process management and deployment automation

### Data Flow

```
Client Request → API Server → SQLite Queue → Worker Process → Puppeteer → Target Website
     ↓              ↓            ↓              ↓              ↓
Job ID Return ← Job Storage ← Job Processing ← HTML Extraction ← Rendered Page
```

## API Endpoints

### Authentication

All endpoints require an API key passed as a query parameter:
- **Parameter**: `key`
- **Default Value**: `predicthire-scraper-2025`
- **Environment Override**: `SCRAPER_KEY`

### Endpoints

#### `GET /scrape`

Submit a new scraping job to the queue.

**Parameters:**
- `key` (required) - API authentication key
- `url` (required) - Target URL to scrape

**Response:**
```json
{
  "jobId": 1,
  "url": "https://example.com",
  "status": "queued",
  "message": "Scraping job queued successfully"
}
```

**Example:**
```bash
curl "http://localhost:3000/scrape?key=predicthire-scraper-2025&url=https://example.com"
```

#### `GET /status/:jobId`

Check the status of a specific job.

**Parameters:**
- `key` (required) - API authentication key
- `jobId` (path parameter) - Job ID returned from `/scrape`

**Response:**
```json
{
  "jobId": 1,
  "url": "https://example.com",
  "status": "completed",
  "createdAt": "2025-08-19 11:03:59",
  "startedAt": "2025-08-19 11:04:00",
  "completedAt": "2025-08-19 11:04:02",
  "error": null
}
```

**Job Statuses:**
- `queued` - Job is waiting to be processed
- `processing` - Job is currently being scraped
- `completed` - Job finished successfully
- `failed` - Job encountered an error

**Example:**
```bash
curl "http://localhost:3000/status/1?key=predicthire-scraper-2025"
```

#### `GET /result/:jobId`

Retrieve the scraped HTML content for a completed job.

**Parameters:**
- `key` (required) - API authentication key
- `jobId` (path parameter) - Job ID returned from `/scrape`

**Response:**
```json
{
  "jobId": 1,
  "url": "https://example.com",
  "html": "<html><head>...</head><body>...</body></html>",
  "completedAt": "2025-08-19 11:04:02"
}
```

**Error Responses:**
- `404` - Job not found
- `400` - Job not completed yet

**Example:**
```bash
curl "http://localhost:3000/result/1?key=predicthire-scraper-2025"
```

#### `GET /health`

System health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-19T11:03:47.462Z",
  "database": "connected"
}
```

**Example:**
```bash
curl "http://localhost:3000/health"
```

## Database Schema

### Jobs Table

The SQLite database contains a single `jobs` table with the following schema:

```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  result TEXT,
  error TEXT
);
```

**Columns:**
- `id` - Unique job identifier (auto-increment)
- `url` - Target URL to scrape
- `status` - Current job status (queued/processing/completed/failed)
- `created_at` - Job submission timestamp
- `started_at` - Job processing start timestamp
- `completed_at` - Job completion timestamp
- `result` - JSON-encoded scraping result (HTML content)
- `error` - Error message if job failed

## Worker Process

### Job Processing

The worker process (`queue-worker.js`) continuously polls the SQLite database for queued jobs and processes them using Puppeteer:

1. **Polling**: Checks for queued jobs every 2 seconds
2. **Processing**: Updates job status to 'processing' and launches Puppeteer
3. **Scraping**: Navigates to target URL and waits for page load
4. **Storage**: Saves HTML content and updates job status to 'completed'
5. **Error Handling**: Captures errors and marks jobs as 'failed'

### Puppeteer Configuration

The scraper uses advanced stealth techniques to avoid detection and appear human-like:

```javascript
const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=VizDisplayCompositor",
    // ... additional stealth arguments
  ],
});
```

**Stealth Features:**
- **Headless Mode**: `"new"` - Latest headless implementation
- **Automation Detection**: Disabled via `--disable-blink-features=AutomationControlled`
- **Realistic User Agents**: Rotated from pool of common Chrome user agents
- **Random Viewports**: Simulates different screen resolutions (1920x1080, 1366x768, etc.)
- **Browser Headers**: Complete set of realistic HTTP headers
- **WebDriver Removal**: JavaScript injection to remove `navigator.webdriver` property
- **Plugin Simulation**: Mocked browser plugins and language settings
- **Human Timing**: Random delays between actions (1-3 seconds before navigation, 0.5-2 seconds after load)
- **Mouse Movement**: Simulated cursor movement to random coordinates
- **Scroll Behavior**: Random scrolling to mimic reading patterns
- **Fingerprint Evasion**: Removes automation indicators and CDC properties

**Settings:**
- **Timeout**: 60 seconds for page navigation
- **Wait Strategy**: `networkidle2` - Wait until ≤2 network connections remain
- **Viewport Rotation**: 5 common screen resolutions randomly selected
- **User Agent Rotation**: 5 recent Chrome user agents for Windows, macOS, and Linux

### Automatic Cleanup

The worker automatically removes old jobs to prevent database bloat:
- **Frequency**: Every hour
- **Retention**: 24 hours for completed/failed jobs
- **Query**: `DELETE FROM jobs WHERE status IN ('completed', 'failed') AND created_at < datetime('now', '-1 day')`

## Deployment

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn package manager
- Chrome/Chromium browser (installed automatically by Puppeteer)

### Installation

```bash
git clone https://github.com/PhilipLeth/scraper-api.git
cd scraper-api
npm install
```

### Manual Startup

```bash
# Start API server
npm start

# Start worker process (in separate terminal)
npm run worker

# Start both processes simultaneously
npm run dev
```

### Production Deployment

Use the included deployment script for production:

```bash
./deploy.sh
```

**Deployment Script Features:**
- Installs Chrome browser for Puppeteer
- Updates npm dependencies
- Stops existing processes gracefully
- Starts both API server and worker with process management
- Supports PM2 (preferred) or nohup fallback
- Creates log files for monitoring

### Process Management

#### With PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Deploy with PM2
./deploy.sh

# Monitor processes
pm2 status
pm2 logs scraper-api
pm2 logs scraper-worker

# Restart processes
pm2 restart scraper-api
pm2 restart scraper-worker
```

#### With nohup (Fallback)

```bash
# Deploy with nohup
./deploy.sh

# Check processes
ps aux | grep node

# View logs
tail -f scraper.log
tail -f worker.log

# Stop processes
kill $(cat scraper.pid)
kill $(cat worker.pid)
```

## Configuration

### Environment Variables

- `SCRAPER_KEY` - API authentication key (default: "predicthire-scraper-2025")
- `PORT` - HTTP server port (default: 3000)

### Network Configuration

The API server binds to `0.0.0.0:3000` by default, making it accessible from external networks. Ensure your firewall allows inbound connections on port 3000:

```bash
# Allow port 3000 through iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## Usage Examples

### Basic Workflow

```bash
# 1. Submit scraping job
RESPONSE=$(curl -s "http://localhost:3000/scrape?key=predicthire-scraper-2025&url=https://example.com")
JOB_ID=$(echo $RESPONSE | jq -r '.jobId')

# 2. Wait for completion (poll status)
while true; do
  STATUS=$(curl -s "http://localhost:3000/status/$JOB_ID?key=predicthire-scraper-2025" | jq -r '.status')
  if [ "$STATUS" = "completed" ]; then
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Job failed"
    exit 1
  fi
  sleep 1
done

# 3. Retrieve results
curl "http://localhost:3000/result/$JOB_ID?key=predicthire-scraper-2025" | jq -r '.html' > scraped_content.html
```

### JavaScript Integration

```javascript
class ScraperClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async scrape(url) {
    // Submit job
    const response = await fetch(`${this.baseUrl}/scrape?key=${this.apiKey}&url=${encodeURIComponent(url)}`);
    const { jobId } = await response.json();

    // Poll for completion
    while (true) {
      const statusResponse = await fetch(`${this.baseUrl}/status/${jobId}?key=${this.apiKey}`);
      const { status } = await statusResponse.json();

      if (status === 'completed') {
        break;
      } else if (status === 'failed') {
        throw new Error('Scraping job failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get results
    const resultResponse = await fetch(`${this.baseUrl}/result/${jobId}?key=${this.apiKey}`);
    const { html } = await resultResponse.json();
    return html;
  }
}

// Usage
const scraper = new ScraperClient('http://localhost:3000', 'predicthire-scraper-2025');
const html = await scraper.scrape('https://example.com');
```

### Python Integration

```python
import requests
import time
import json

class ScraperClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key

    def scrape(self, url):
        # Submit job
        response = requests.get(f"{self.base_url}/scrape", params={
            'key': self.api_key,
            'url': url
        })
        job_id = response.json()['jobId']

        # Poll for completion
        while True:
            status_response = requests.get(f"{self.base_url}/status/{job_id}", params={
                'key': self.api_key
            })
            status = status_response.json()['status']

            if status == 'completed':
                break
            elif status == 'failed':
                raise Exception('Scraping job failed')

            time.sleep(1)

        # Get results
        result_response = requests.get(f"{self.base_url}/result/{job_id}", params={
            'key': self.api_key
        })
        return result_response.json()['html']

# Usage
scraper = ScraperClient('http://localhost:3000', 'predicthire-scraper-2025')
html = scraper.scrape('https://example.com')
```

## Monitoring and Troubleshooting

### Log Files

- `scraper.log` - API server logs
- `worker.log` - Worker process logs

### Common Issues

#### Job Stuck in 'queued' Status
- **Cause**: Worker process not running
- **Solution**: Start worker with `npm run worker` or `./deploy.sh`

#### Job Fails with Timeout Error
- **Cause**: Target website takes too long to load
- **Solution**: Increase timeout in `queue-worker.js` (currently 60 seconds)

#### Database Locked Error
- **Cause**: Multiple processes accessing SQLite simultaneously
- **Solution**: Ensure only one worker process is running

#### External Access Issues
- **Cause**: Firewall blocking port 3000
- **Solution**: Configure firewall to allow inbound connections

### Performance Tuning

#### Concurrent Processing
The current implementation processes jobs sequentially. For higher throughput, consider:
- Running multiple worker processes
- Implementing job locking to prevent conflicts
- Using a more robust queue system (Redis/BullMQ)

#### Memory Management
- Monitor browser instances for memory leaks
- Restart worker process periodically if memory usage grows
- Implement browser instance pooling for high-volume scenarios

#### Database Optimization
- Add indexes for frequently queried columns
- Consider partitioning for very large job volumes
- Monitor database file size and implement archiving

## Security Considerations

### API Key Management
- Change default API key in production
- Use environment variables for sensitive configuration
- Implement rate limiting for production use

### Network Security
- Use HTTPS in production environments
- Implement IP whitelisting if needed
- Consider VPN or private network deployment

### Input Validation
- Validate URLs before processing
- Implement domain whitelisting/blacklisting
- Sanitize user inputs to prevent injection attacks

## Anti-Detection Features

The scraper includes comprehensive stealth capabilities to avoid bot detection:

### Browser Fingerprinting Evasion
- **WebDriver Property Removal**: Eliminates `navigator.webdriver` detection
- **Automation Indicators**: Removes Chrome DevTools Protocol (CDP) properties
- **Plugin Simulation**: Mocks realistic browser plugin array
- **Language Settings**: Sets realistic language preferences

### Traffic Pattern Mimicking
- **Random Delays**: Variable timing between requests (1-3 seconds)
- **Human-like Navigation**: Mouse movements and scroll patterns
- **Realistic Headers**: Complete HTTP header sets matching real browsers
- **User Agent Rotation**: Cycles through current Chrome versions

### Browser Configuration
- **Viewport Diversity**: Random screen resolutions from common devices
- **Feature Flags**: Disables automation-specific Chrome features
- **Resource Loading**: Mimics normal browser resource handling

### Best Practices for Stealth Scraping
1. **Respect Rate Limits**: Don't overwhelm target servers
2. **Rotate Proxies**: Consider proxy rotation for high-volume scraping
3. **Monitor Success Rates**: Track blocked requests and adjust timing
4. **Update User Agents**: Keep user agent strings current
5. **Test Regularly**: Verify stealth features against detection tools

### Limitations
- Some advanced bot detection systems may still identify automated traffic
- JavaScript-heavy detection methods may require additional countermeasures
- Consider using residential proxies for maximum stealth

## Migration from Synchronous Version

### Breaking Changes

The queue-based implementation introduces breaking changes from the original synchronous API:

**Before (Synchronous):**
```bash
curl "http://localhost:3000/scrape?key=API_KEY&url=URL"
# Returns: {"url": "...", "html": "..."}
```

**After (Asynchronous):**
```bash
# Step 1: Submit job
curl "http://localhost:3000/scrape?key=API_KEY&url=URL"
# Returns: {"jobId": 1, "status": "queued", ...}

# Step 2: Check status
curl "http://localhost:3000/status/1?key=API_KEY"
# Returns: {"status": "completed", ...}

# Step 3: Get results
curl "http://localhost:3000/result/1?key=API_KEY"
# Returns: {"html": "...", ...}
```

### Migration Strategy

1. **Update Client Code**: Modify applications to use the new three-step workflow
2. **Implement Polling**: Add status polling logic to wait for job completion
3. **Error Handling**: Update error handling for new response formats
4. **Testing**: Thoroughly test the new asynchronous workflow

## Contributing

### Development Setup

```bash
git clone https://github.com/PhilipLeth/scraper-api.git
cd scraper-api
npm install
npm run dev  # Starts both API server and worker
```

### Code Structure

- `index.js` - Main API server with Express routes
- `queue-worker.js` - Background job processor
- `deploy.sh` - Production deployment script
- `package.json` - Dependencies and npm scripts

### Testing

```bash
# Test job submission
curl "http://localhost:3000/scrape?key=predicthire-scraper-2025&url=https://httpbin.org/html"

# Test health endpoint
curl "http://localhost:3000/health"

# Monitor logs
tail -f scraper.log worker.log
```
