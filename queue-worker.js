const sqlite3 = require("sqlite3").verbose();
const puppeteer = require("puppeteer");
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, 'queue.db'));

console.log('✅ Queue worker started');

async function processJob(job) {
  console.log(`Processing job ${job.id} for URL: ${job.url}`);
  
  db.run("UPDATE jobs SET status = 'processing', started_at = CURRENT_TIMESTAMP WHERE id = ?", [job.id]);
  
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-default-apps",
        "--disable-popup-blocking",
        "--disable-translate",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-ipc-flooding-protection",
        "--enable-features=NetworkService,NetworkServiceLogging",
        "--force-color-profile=srgb",
        "--metrics-recording-only",
        "--use-mock-keychain"
      ],
    });
    
    const page = await browser.newPage();
    
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(viewport);
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(userAgent);
    
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    const delay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await page.goto(job.url, { 
      waitUntil: "networkidle2", 
      timeout: 60000 
    });
    
    const postLoadDelay = Math.floor(Math.random() * 1500) + 500;
    await new Promise(resolve => setTimeout(resolve, postLoadDelay));
    
    await page.mouse.move(
      Math.floor(Math.random() * viewport.width),
      Math.floor(Math.random() * viewport.height)
    );
    
    await page.evaluate(() => {
      window.scrollTo(0, Math.floor(Math.random() * 500));
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const html = await page.content();
    await browser.close();
    
    const result = JSON.stringify({ html });
    db.run("UPDATE jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP, result = ? WHERE id = ?", 
      [result, job.id]);
    
    console.log(`Completed job ${job.id}`);
    
  } catch (error) {
    console.error(`Failed job ${job.id}:`, error.message);
    
    db.run("UPDATE jobs SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error = ? WHERE id = ?", 
      [error.message, job.id]);
  }
}

function pollForJobs() {
  db.get("SELECT id, url FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1", 
    async (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return;
    }
    
    if (row) {
      await processJob(row);
    }
  });
}

setInterval(pollForJobs, 2000);

function cleanupOldJobs() {
  db.run("DELETE FROM jobs WHERE status IN ('completed', 'failed') AND created_at < datetime('now', '-1 day')", 
    (err) => {
    if (err) {
      console.error('Cleanup error:', err);
    } else {
      console.log('Cleaned up old jobs');
    }
  });
}

setInterval(cleanupOldJobs, 3600000);

process.on('SIGINT', () => {
  console.log('Shutting down worker...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down worker...');
  db.close();
  process.exit(0);
});
