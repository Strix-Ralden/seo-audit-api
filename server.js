const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

// =======================
// 🔧 HELPERS
// =======================

// нормализация URL
function normalizeUrl(input) {
  if (!input.startsWith("http")) {
    return "https://" + input;
  }
  return input;
}

// проверка индексации
async function checkIndexing(url) {
  try {
    const domain = new URL(url).hostname;

    let googleIndexed = false;
    let yandexIndexed = false;

    try {
      const google = await axios.get(
        `https://www.google.com/search?q=site:${domain}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );

      googleIndexed =
        google.data.includes("/url?q=") || google.data.includes("<cite>");
    } catch {}

    try {
      const yandex = await axios.get(
        `https://yandex.ru/search/?text=site:${domain}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );

      yandexIndexed =
        yandex.data.includes("b-serp-item") || yandex.data.includes("organic");
    } catch {}

    return { googleIndexed, yandexIndexed };
  } catch {
    return { googleIndexed: false, yandexIndexed: false };
  }
}

// PageSpeed
async function getPSI(url, apiKey, strategy) {
  try {
    const res = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=${strategy}&key=${apiKey}`
    );

    const l = res.data.lighthouseResult;

    return {
      score: Math.round(l.categories.performance.score * 100),
      lcp: l.audits["largest-contentful-paint"].displayValue,
      cls: l.audits["cumulative-layout-shift"].displayValue,
      loadTime: l.audits["largest-contentful-paint"].displayValue
    };
  } catch {
    return null;
  }
}

// =======================
// 🚀 ROUTES
// =======================

app.get("/", (req, res) => {
  res.send("SEO Audit API работает 🚀");
});

app.get("/audit", async (req, res) => {
  let { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL обязателен" });
  }

  url = normalizeUrl(url);

  try {
    // =======================
    // HTML
    // =======================
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

    let internalLinks = 0;
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("/")) internalLinks++;
    });

    const domain = new URL(url).origin;

    let hasRobots = false;
    try {
      await axios.get(domain + "/robots.txt");
      hasRobots = true;
    } catch {}

    let hasSitemap = false;
    try {
      await axios.get(domain + "/sitemap.xml");
      hasSitemap = true;
    } catch {}

    const isHttps = url.startsWith("https");

    const titleLength = title.length;
    const descLength = description ? description.length : 0;

    // =======================
    // SEO SCORE
    // =======================
    let score = 0;

    if (title && titleLength >= 10 && titleLength <= 60) score += 10;
    if (description && descLength >= 50 && descLength <= 160) score += 10;
    if (h1List.length === 1) score += 10;
    if (imagesWithoutAlt === 0) score += 10;
    if (canonical) score += 10;
    if (internalLinks > 0) score += 10;
    if (hasRobots) score += 10;
    if (hasSitemap) score += 10;
    if (isHttps) score += 10;
    if (title) score += 10;

    // =======================
    // SPEED
    // =======================
    const apiKey = process.env.API_KEY;

    const mobile = await getPSI(url, apiKey, "mobile");
    const desktop = await getPSI(url, apiKey, "desktop");

    function compare(score) {
      if (!score) return null;
      return Math.min(99, Math.max(1, score));
    }

    // =======================
    // INDEXING
    // =======================
    const indexing = await checkIndexing(url);

    // =======================
    // RESPONSE
    // =======================
    res.json({
      title,
      description,
      h1,
      h1Count: h1List.length,
      imagesWithoutAlt,
      internalLinks,
      canonical,
      hasRobots,
      hasSitemap,
      isHttps,
      titleLength,
      descLength,
      score,

      // INDEXING
      googleIndexed: indexing.googleIndexed,
      yandexIndexed: indexing.yandexIndexed,

      // SPEED
      pageSpeedMobile: mobile?.score,
      pageSpeedDesktop: desktop?.score,
      loadTimeMobile: mobile?.loadTime,
      loadTimeDesktop: desktop?.loadTime,

      // CORE WEB VITALS
      lcpMobile: mobile?.lcp,
      clsMobile: mobile?.cls,
      lcpDesktop: desktop?.lcp,
      clsDesktop: desktop?.cls,

      // COMPARISON
      fasterThanMobile: compare(mobile?.score),
      fasterThanDesktop: compare(desktop?.score)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка анализа сайта" });
  }
});

app.listen(3000, () => console.log("Server started 🚀"));
