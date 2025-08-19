const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;
const API_KEY = process.env.SCRAPER_KEY || "predicthire-scraper-2025";

const db = new sqlite3.Database(path.join(__dirname, 'queue.db'));

app.get("/scrape", async (req, res) => {
  if (req.query.key !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const stmt = db.prepare("INSERT INTO jobs (url, status) VALUES (?, 'queued')");
    stmt.run(url, function(err) {
      if (err) {
        return res.status(500).json({ error: "Failed to queue job", details: err.message });
      }
      
      res.json({ 
        jobId: this.lastID,
        url,
        status: 'queued',
        message: 'Scraping job queued successfully'
      });
    });
    stmt.finalize();
  } catch (err) {
    res.status(500).json({ error: "Failed to queue scrape job", details: err.message });
  }
});

app.get("/status/:jobId", (req, res) => {
  if (req.query.key !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  const jobId = req.params.jobId;
  
  db.get("SELECT id, url, status, created_at, started_at, completed_at, error FROM jobs WHERE id = ?", 
    [jobId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to get job status", details: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      jobId: row.id,
      url: row.url,
      status: row.status,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      error: row.error
    });
  });
});

app.get("/result/:jobId", (req, res) => {
  if (req.query.key !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  const jobId = req.params.jobId;
  
  db.get("SELECT id, url, status, result, completed_at FROM jobs WHERE id = ?", 
    [jobId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to get result", details: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    if (row.status !== 'completed') {
      return res.status(400).json({ error: "Job not completed", status: row.status });
    }

    const result = JSON.parse(row.result);
    res.json({
      jobId: row.id,
      url: row.url,
      html: result.html,
      completedAt: row.completed_at
    });
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Scraper API running at http://0.0.0.0:${PORT}`)
);
