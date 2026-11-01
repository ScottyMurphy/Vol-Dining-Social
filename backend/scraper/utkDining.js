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

function normalizeDiningHallMenu(menuData) {
  const meals = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  const subLocations = menuData.subLocations || {};

  for (const subLocation of Object.values(subLocations)) {
    const category = subLocation.name || "Other";
    const mealPeriods = subLocation.mealPeriods || {};

    for (const mealPeriod of Object.values(mealPeriods)) {
      const mealName = mealPeriod.name?.toLowerCase();

      if (!meals[mealName]) {
        continue;
      }

      const menuItems = mealPeriod.menuItems || [];

      for (const item of menuItems) {
        const nutrition = item.nutrition || {};

        const caloriesValue =
          nutrition.primary_attributes?.calories?.value;

        const calories = caloriesValue
          ? Number(caloriesValue)
          : null;

        const dietary = [];

        if (
          nutrition.dietary_attributes?.vegetarian?.value === "Y"
        ) {
          dietary.push("V");
        }

        if (
          nutrition.dietary_attributes?.vegan?.value === "Y"
        ) {
          dietary.push("VE");
        }

        meals[mealName].push({
          id: item.id,
          name: item.name,
          category,
          calories,
          description: nutrition.description || null,
          dietary,
        });
      }
    }
  }

  return meals;
}

async function scrapeDiningHallMenu(menuUrl) {
  const response = await axios.get(menuUrl);

  const $ = cheerio.load(response.data);

  const menuElement = $("#sm-dynamic-menu");

  if (!menuElement.length) {
    throw new Error("Dining hall menu data was not found");
  }

  const rawData = menuElement.attr("data-data");

  if (!rawData) {
    throw new Error("Dining hall menu data is empty");
  }

  let menuData;

  try {
    menuData = JSON.parse(rawData);
  } catch (error) {
    throw new Error("Failed to parse dining hall menu data");
  }

  console.log("DINING HALL MENU LOADED");

  return normalizeDiningHallMenu(menuData);
}
module.exports = {
  scrapeLocations,
  scrapeMenu,
};