const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("SEO Audit API работает 🚀");
});

app.get("/audit", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL обязателен" });
  }

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);

    const title = $("title").text();
    const description = $('meta[name="description"]').attr("content");
    const h1List = $("h1");
    const h1 = h1List.first().text();
    const canonical = $('link[rel="canonical"]').attr("href");

    let imagesWithoutAlt = 0;
    $("img").each((i, el) => {
      if (!$(el).attr("alt")) imagesWithoutAlt++;
    });

    let hasRobots = false;
    try { await axios.get(url + "/robots.txt"); hasRobots = true; } catch {}

    let hasSitemap = false;
    try { await axios.get(url + "/sitemap.xml"); hasSitemap = true; } catch {}

    const isHttps = url.startsWith("https");

    let score = 0;
    if (title) score += 10;
    if (description) score += 10;
    if (h1List.length === 1) score += 10;
    if (imagesWithoutAlt === 0) score += 10;
    if (canonical) score += 10;
    if (hasRobots) score += 10;
    if (hasSitemap) score += 10;
    if (isHttps) score += 10;

    const apiKey = "YOUR_API_KEY";

    async function getPSI(strategy) {
      try {
        const res = await axios.get(
          `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=${strategy}&key=${apiKey}`
        );

        const data = res.data.lighthouseResult;

        return {
          score: Math.round(data.categories.performance.score * 100),
          lcp: data.audits["largest-contentful-paint"].displayValue,
          cls: data.audits["cumulative-layout-shift"].displayValue
        };
      } catch {
        return null;
      }
    }

    const mobile = await getPSI("mobile");
    const desktop = await getPSI("desktop");

    function compare(score) {
      if (!score) return null;
      return Math.min(99, Math.max(1, score));
    }

    res.json({
      title,
      description,
      h1,
      h1Count: h1List.length,
      imagesWithoutAlt,
      canonical,
      hasRobots,
      hasSitemap,
      isHttps,
      score,
      pageSpeedMobile: mobile?.score,
      pageSpeedDesktop: desktop?.score,
      lcpMobile: mobile?.lcp,
      clsMobile: mobile?.cls,
      lcpDesktop: desktop?.lcp,
      clsDesktop: desktop?.cls,
      fasterThanMobile: compare(mobile?.score),
      fasterThanDesktop: compare(desktop?.score)
    });

  } catch (err) {
    res.status(500).json({ error: "Ошибка анализа сайта" });
  }
});

app.listen(3000, () => console.log("Server started"));
