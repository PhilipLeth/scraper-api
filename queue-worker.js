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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    await page.goto(job.url, { waitUntil: "networkidle2", timeout: 60000 });
    
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
