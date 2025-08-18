const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;
const API_KEY = process.env.SCRAPER_KEY || "predicthire-scraper-2025";

app.get("/scrape", async (req, res) => {
  if (req.query.key !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const browser = await puppeteer.launch({
      headless: "new", // proper headless mode
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const html = await page.content();
    await browser.close();

    res.json({ url, html });
  } catch (err) {
    res.status(500).json({ error: "Failed to scrape", details: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Scraper API running at http://0.0.0.0:${PORT}`)
);
