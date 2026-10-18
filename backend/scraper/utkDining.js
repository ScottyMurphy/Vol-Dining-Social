const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeLocations() {
  const url = "https://dining.utk.edu/locations-and-menus/";

  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const locations = [];
  const seen = new Set();

  $("h5").each((_, element) => {
    const name = $(element).text().trim();

    if (!name || seen.has(name)) {
      return;
    }

    seen.add(name);

    let container = $(element);
    let menuUrl = null;

    for (let i = 0; i < 6; i++) {
      container = container.parent();

      if (!container.length) {
        break;
      }

      container.find("a").each((_, link) => {
        const text = $(link).text().trim();

        if (
          text.includes("View Menu") ||
          text.includes("Full Menu & Hours")
        ) {
          menuUrl = $(link).attr("href");
        }
      });

      if (menuUrl) {
        break;
      }
    }

    locations.push({
      name,
      menuUrl: menuUrl || null,
    });
  });

  return locations;
}

async function scrapeMenu(menuUrl) {
  if (menuUrl.includes("/vendor/")) {
    return scrapeDiningHallMenu(menuUrl);
  }

  return scrapeRegularMenu(menuUrl);
}

async function scrapeRegularMenu(menuUrl) {
  const response = await axios.get(menuUrl);
  const $ = cheerio.load(response.data);

  const menu = [];
  let currentCategory = null;

  $("h3, h5").each((_, element) => {
    const tag = element.tagName.toLowerCase();
    const text = $(element).text().trim();

    if (tag === "h3") {
      currentCategory = text;
      return;
    }

    if (tag === "h5" && currentCategory) {
      const rawName = text;

      let itemName = rawName;
      let dietary = [];

      const dietaryMatch = rawName.match(
        /\((V(?:,\s*VE)?|VE(?:,\s*V)?)\)$/
      );

      if (dietaryMatch) {
        dietary = dietaryMatch[1]
          .split(",")
          .map((tag) => tag.trim());

        itemName = rawName
          .replace(
            /\s*\((V(?:,\s*VE)?|VE(?:,\s*V)?)\)$/,
            ""
          )
          .trim();
      }

      const itemContainer = $(element).parent();

      const description = itemContainer
        .find("p")
        .first()
        .text()
        .trim();

      let price = null;

      let container = $(element).parent();

      for (let i = 0; i < 8; i++) {
        if (!container.length) {
          break;
        }

        const containerText = container.text();

        const priceMatch = containerText.match(
          /\$\d+(?:\.\d{2})?/
        );

        if (priceMatch) {
          price = priceMatch[0];
          break;
        }

        container = container.parent();
      }

      menu.push({
        category: currentCategory,
        name: itemName,
        description,
        price,
        dietary,
      });
    }
  });

  return menu;
}

async function scrapeDiningHallMenu(menuUrl) {
  const { chromium } = require("playwright");

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    page.on("response", async (response) => {
      const url = response.url().toLowerCase();

      if (
        url.includes("json") ||
        url.includes("api") ||
        url.includes("menu") ||
        url.includes("vendor") ||
        url.includes("graphql")
      ) {
        console.log(
          "RESPONSE:",
          response.status(),
          response.url()
        );
      }
    });

    await page.goto(menuUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    console.log("\n=== SCRIPT SOURCES ===");

    const scripts = await page
      .locator("script")
      .evaluateAll((elements) =>
        elements.map((script) => ({
          src: script.src || null,
          text: script.src
            ? null
            : script.textContent?.slice(0, 500),
        }))
      );

    console.log(scripts);

    console.log("\n=== PAGE HTML AROUND MENU ===");

    const menuHtml = await page.evaluate(() => {
      const menu = document.querySelector("#menu");

      if (!menu) {
        return "NO #menu ELEMENT FOUND";
      }

      return menu.outerHTML;
    });

    console.log(menuHtml);

    return [];
  } finally {
    await browser.close();
  }
}