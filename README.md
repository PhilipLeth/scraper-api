# Scraper API

A lightweight **asynchronous web scraping API** powered by [Puppeteer](https://pptr.dev/) and Express with SQLite-based job queue management.  
It fetches **fully rendered HTML** (including client-side JavaScript) from any URL using a queue-based architecture for reliable, scalable scraping.

---

## 🚀 Features
- **Asynchronous Processing**: Queue-based job system for non-blocking requests
- **JavaScript Rendering**: Full page rendering with Puppeteer (headless Chrome)
- **Job Tracking**: Real-time status monitoring and result retrieval
- **SQLite Queue**: Persistent job storage with automatic cleanup
- **Background Worker**: Separate process for reliable job processing
- **API Authentication**: Secure access with API key protection
- **Production Ready**: PM2 compatible with deployment automation

---

## 📖 Documentation

**[📚 Complete Documentation](./DOCUMENTATION.md)** - Comprehensive guide covering:
- System architecture and components
- API endpoints with examples
- Deployment and configuration
- Worker process details
- Database schema
- Usage examples in multiple languages
- Troubleshooting and monitoring

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/PhilipLeth/scraper-api.git
cd scraper-api
npm install

# Deploy with automatic process management
./deploy.sh
```

### Basic Usage

The API uses an asynchronous queue system with three main endpoints:

```bash
# 1. Submit scraping job (returns immediately with job ID)
curl "http://localhost:3000/scrape?key=predicthire-scraper-2025&url=https://example.com"
# Returns: {"jobId": 1, "status": "queued", "message": "Scraping job queued successfully"}

# 2. Check job status
curl "http://localhost:3000/status/1?key=predicthire-scraper-2025"
# Returns: {"jobId": 1, "status": "completed", "createdAt": "...", "completedAt": "..."}

# 3. Get scraped HTML content
curl "http://localhost:3000/result/1?key=predicthire-scraper-2025"
# Returns: {"jobId": 1, "url": "https://example.com", "html": "<html>...</html>"}
```

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scrape` | GET | Submit new scraping job |
| `/status/:jobId` | GET | Check job status |
| `/result/:jobId` | GET | Retrieve scraped HTML |
| `/health` | GET | System health check |

**Authentication**: All endpoints require `key=predicthire-scraper-2025` parameter.

---

## 🏗️ Architecture

```
Client Request → API Server → SQLite Queue → Worker Process → Puppeteer → Target Website
     ↓              ↓            ↓              ↓              ↓
Job ID Return ← Job Storage ← Job Processing ← HTML Extraction ← Rendered Page
```

**Components:**
- **API Server** (`index.js`) - Express server handling HTTP requests
- **Queue Worker** (`queue-worker.js`) - Background scraping process
- **SQLite Database** (`queue.db`) - Persistent job storage
- **Deploy Script** (`deploy.sh`) - Production deployment automation

---

## 📋 Migration from Synchronous Version

**Breaking Change**: The API now uses asynchronous job processing instead of blocking requests.

**Before (Synchronous):**
```bash
curl "/scrape?key=API_KEY&url=URL"
# Returned HTML directly after waiting
```

**After (Asynchronous):**
```bash
# Submit job → Check status → Get results
curl "/scrape?key=API_KEY&url=URL"     # Get job ID
curl "/status/1?key=API_KEY"           # Poll until completed  
curl "/result/1?key=API_KEY"           # Retrieve HTML
```

---

## 🚀 Deployment

### Development
```bash
npm run dev  # Starts both API server and worker
```

### Production
```bash
./deploy.sh  # Automated deployment with process management
```

The deployment script handles:
- Chrome browser installation
- Dependency updates
- Process management (PM2 or nohup)
- Log file creation
- Graceful restarts

---

## 📊 Monitoring

**Log Files:**
- `scraper.log` - API server logs
- `worker.log` - Worker process logs

**Health Check:**
```bash
curl "http://localhost:3000/health"
```

**Process Status:**
```bash
pm2 status                    # With PM2
ps aux | grep node           # With nohup
```

---

## 🔒 Security

- **API Key Authentication**: Required for all endpoints
- **Input Validation**: URL validation and sanitization
- **Network Security**: Configurable firewall rules
- **Environment Variables**: Secure configuration management

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

**Development Setup:**
```bash
git clone https://github.com/PhilipLeth/scraper-api.git
cd scraper-api
npm install
npm run dev
```

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🆘 Support

- **Documentation**: [Complete Documentation](./DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/PhilipLeth/scraper-api/issues)
- **API Reference**: See documentation for detailed endpoint specifications

