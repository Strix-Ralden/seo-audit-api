const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/audit", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL обязателен" });
  }

  try {try {
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

  // robots.txt
  let hasRobots = false;
  try {
    await axios.get(url + "/robots.txt");
    hasRobots = true;
  } catch {}

  // sitemap.xml
  let hasSitemap = false;
  try {
    await axios.get(url + "/sitemap.xml");
    hasSitemap = true;
  } catch {}

  // HTTPS
  const isHttps = url.startsWith("https");

  // длина title
  const titleLength = title.length;

  // длина description
  const descLength = description ? description.length : 0;

  // score
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
  score
});

} catch (err) {
  res.status(500).json({ error: "Ошибка анализа сайта" });
}});

    const $ = cheerio.load(data);

    const title = $("title").text();
    const description = $('meta[name="description"]').attr("content");
    const h1 = $("h1").first().text();

    let imagesWithoutAlt = 0;
    $("img").each((i, el) => {
      if (!$(el).attr("alt")) imagesWithoutAlt++;
    });

    let score = 0;
    if (title) score += 25;
    if (description) score += 25;
    if (h1) score += 25;
    if (imagesWithoutAlt === 0) score += 25;

    res.json({
      title,
      description,
      h1,
      imagesWithoutAlt,
      score
    });

  } catch (err) {
    res.status(500).json({ error: "Ошибка анализа сайта" });
  }
});

app.listen(3000, () => console.log("Server started"));
