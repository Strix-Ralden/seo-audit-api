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

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

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