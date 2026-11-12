const BASE_URL = "http://localhost:4000";

let passed = 0;
let failed = 0;

function pass(name) {
  passed++;
  console.log(`PASS: ${name}`);
}

function fail(name, message) {
  failed++;
  console.error(`FAIL: ${name}`);
  console.error(`      ${message}`);
}

async function requestJson(url) {
  const response = await fetch(url);

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Some failure responses might not contain JSON.
  }

  return {
    response,
    data,
  };
}

async function test(name, callback) {
  try {
    await callback();
    pass(name);
  } catch (error) {
    fail(name, error.message);
  }
}

function validateMenuItem(item) {
  if (!item || typeof item !== "object") {
    throw new Error("Menu item is not an object");
  }

  if (!item.name || typeof item.name !== "string") {
    throw new Error("Menu item is missing a valid name");
  }

  if (!item.category || typeof item.category !== "string") {
    throw new Error(
      `Item "${item.name}" is missing a valid category`
    );
  }

  if (
    item.calories !== undefined &&
    item.calories !== null &&
    typeof item.calories !== "number"
  ) {
    throw new Error(
      `Item "${item.name}" has invalid calories`
    );
  }

  if (
    item.dietary !== undefined &&
    !Array.isArray(item.dietary)
  ) {
    throw new Error(
      `Item "${item.name}" has invalid dietary data`
    );
  }

  if (Array.isArray(item.dietary)) {
    const validDietaryTags = ["V", "VE"];

    for (const tag of item.dietary) {
      if (!validDietaryTags.includes(tag)) {
        throw new Error(
          `Item "${item.name}" has unknown dietary tag "${tag}"`
        );
      }
    }
  }

  if (
    item.description !== undefined &&
    item.description !== null &&
    typeof item.description !== "string"
  ) {
    throw new Error(
      `Item "${item.name}" has invalid description`
    );
  }
}

function validateGroupedMenu(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Grouped menu is not an object");
  }

  for (const meal of [
    "breakfast",
    "lunch",
    "dinner",
  ]) {
    if (!Array.isArray(data[meal])) {
      throw new Error(
        `${meal} is missing or is not an array`
      );
    }

    if (data[meal].length === 0) {
      throw new Error(
        `${meal} returned no menu items`
      );
    }

    for (const item of data[meal]) {
      validateMenuItem(item);
    }
  }
}

function getEncodedMenuUrl(url) {
  return encodeURIComponent(url);
}

async function runTests() {
  console.log("\n==============================");
  console.log(" Vol Dining API Test Suite");
  console.log("==============================\n");

  /*
   * Health
   */

  await test("Backend health endpoint", async () => {
    const { response, data } =
      await requestJson(
        `${BASE_URL}/api/health`
      );

    if (!response.ok) {
      throw new Error(
        `Expected HTTP 200, got ${response.status}`
      );
    }

    if (data?.ok !== true) {
      throw new Error(
        "Expected response { ok: true }"
      );
    }
  });

  /*
   * URLs
   */

  const rockyTopVendorUrl =
    "https://dining.utk.edu/vendor/rocky-top-dining-hall/";

  const stokelyVendorUrl =
    "https://dining.utk.edu/vendor/stokely-dining-hall/";

  const taqueriaUrl =
    "https://dining.utk.edu/locations-and-menus/1817-taqueria-menu/";

  let rockyGrouped = null;
  let stokelyGrouped = null;

  /*
   * Rocky Top grouped menu
   */

  await test(
    "Rocky Top grouped menu loads",
    async () => {
      const url =
        `${BASE_URL}/api/menu?url=` +
        getEncodedMenuUrl(rockyTopVendorUrl);

      const { response, data } =
        await requestJson(url);

      if (!response.ok) {
        throw new Error(
          `Expected HTTP 200, got ${response.status}`
        );
      }

      validateGroupedMenu(data);

      rockyGrouped = data;
    }
  );

  /*
   * Stokely grouped menu
   */

  await test(
    "Stokely grouped menu loads",
    async () => {
      const url =
        `${BASE_URL}/api/menu?url=` +
        getEncodedMenuUrl(stokelyVendorUrl);

      const { response, data } =
        await requestJson(url);

      if (!response.ok) {
        throw new Error(
          `Expected HTTP 200, got ${response.status}`
        );
      }

      validateGroupedMenu(data);

      stokelyGrouped = data;
    }
  );

  /*
   * Rocky Top current menu
   */

  await test(
    "Rocky Top current menu",
    async () => {
      const { response, data } =
        await requestJson(
          `${BASE_URL}/api/menus/rocky-top/current`
        );

      if (!response.ok) {
        throw new Error(
          `Expected HTTP 200, got ${response.status}`
        );
      }

      if (data.id !== "rocky-top") {
        throw new Error(
          `Expected id rocky-top, got ${data.id}`
        );
      }

      if (data.name !== "Rocky Top") {
        throw new Error(
          `Unexpected hall name: ${data.name}`
        );
      }

      if (
        !["breakfast", "lunch", "dinner"].includes(
          data.meal
        )
      ) {
        throw new Error(
          `Invalid meal "${data.meal}"`
        );
      }

      if (!Array.isArray(data.items)) {
        throw new Error(
          "Current menu items is not an array"
        );
      }

      if (data.items.length === 0) {
        throw new Error(
          "Current Rocky Top menu is empty"
        );
      }

      data.items.forEach(validateMenuItem);
    }
  );

  /*
   * Stokely current menu
   */

  await test(
    "Stokely current menu",
    async () => {
      const { response, data } =
        await requestJson(
          `${BASE_URL}/api/menus/stokely/current`
        );

      if (!response.ok) {
        throw new Error(
          `Expected HTTP 200, got ${response.status}`
        );
      }

      if (data.id !== "stokely") {
        throw new Error(
          `Expected id stokely, got ${data.id}`
        );
      }

      if (data.name !== "Stokely") {
        throw new Error(
          `Unexpected hall name: ${data.name}`
        );
      }

      if (
        !["breakfast", "lunch", "dinner"].includes(
          data.meal
        )
      ) {
        throw new Error(
          `Invalid meal "${data.meal}"`
        );
      }

      if (!Array.isArray(data.items)) {
        throw new Error(
          "Current menu items is not an array"
        );
      }

      if (data.items.length === 0) {
        throw new Error(
          "Current Stokely menu is empty"
        );
      }

      data.items.forEach(validateMenuItem);
    }
  );

  /*
   * Current menu matches grouped menu
   */

  await test(
    "Rocky Top current meal matches grouped menu",
    async () => {
      if (!rockyGrouped) {
        throw new Error(
          "Rocky Top grouped menu was not loaded"
        );
      }

      const { data } =
        await requestJson(
          `${BASE_URL}/api/menus/rocky-top/current`
        );

      const expected =
        rockyGrouped[data.meal];

      if (!expected) {
        throw new Error(
          `Grouped menu does not contain ${data.meal}`
        );
      }

      if (
        data.items.length !== expected.length
      ) {
        throw new Error(
          `Current endpoint returned ${data.items.length} items but grouped menu has ${expected.length}`
        );
      }

      const currentIds = new Set(
        data.items.map((item) => item.id)
      );

      for (const item of expected) {
        if (!currentIds.has(item.id)) {
          throw new Error(
            `Current menu is missing "${item.name}"`
          );
        }
      }
    }
  );

  await test(
    "Stokely current meal matches grouped menu",
    async () => {
      if (!stokelyGrouped) {
        throw new Error(
          "Stokely grouped menu was not loaded"
        );
      }

      const { data } =
        await requestJson(
          `${BASE_URL}/api/menus/stokely/current`
        );

      const expected =
        stokelyGrouped[data.meal];

      if (!expected) {
        throw new Error(
          `Grouped menu does not contain ${data.meal}`
        );
      }

      if (
        data.items.length !== expected.length
      ) {
        throw new Error(
          `Current endpoint returned ${data.items.length} items but grouped menu has ${expected.length}`
        );
      }
    }
  );

  /*
   * Stations/categories
   */

  await test(
    "Rocky Top has multiple stations",
    async () => {
      if (!rockyGrouped) {
        throw new Error(
          "Rocky Top menu unavailable"
        );
      }

      const allItems = [
        ...rockyGrouped.breakfast,
        ...rockyGrouped.lunch,
        ...rockyGrouped.dinner,
      ];

      const stations = new Set(
        allItems.map((item) =>
          item.category.trim()
        )
      );

      if (stations.size < 2) {
        throw new Error(
          "Expected multiple dining stations"
        );
      }

      console.log(
        `      Rocky Top stations found: ${stations.size}`
      );
    }
  );

  await test(
    "Stokely has multiple stations",
    async () => {
      if (!stokelyGrouped) {
        throw new Error(
          "Stokely menu unavailable"
        );
      }

      const allItems = [
        ...stokelyGrouped.breakfast,
        ...stokelyGrouped.lunch,
        ...stokelyGrouped.dinner,
      ];

      const stations = new Set(
        allItems.map((item) =>
          item.category.trim()
        )
      );

      if (stations.size < 2) {
        throw new Error(
          "Expected multiple dining stations"
        );
      }

      console.log(
        `      Stokely stations found: ${stations.size}`
      );
    }
  );

  /*
   * Dietary information
   */

  await test(
    "Rocky Top contains dietary labels",
    async () => {
      const allItems = [
        ...rockyGrouped.breakfast,
        ...rockyGrouped.lunch,
        ...rockyGrouped.dinner,
      ];

      const dietaryItems =
        allItems.filter(
          (item) =>
            Array.isArray(item.dietary) &&
            item.dietary.length > 0
        );

      if (dietaryItems.length === 0) {
        throw new Error(
          "No dietary labels were found"
        );
      }
    }
  );

  await test(
    "Stokely contains dietary labels",
    async () => {
      const allItems = [
        ...stokelyGrouped.breakfast,
        ...stokelyGrouped.lunch,
        ...stokelyGrouped.dinner,
      ];

      const dietaryItems =
        allItems.filter(
          (item) =>
            Array.isArray(item.dietary) &&
            item.dietary.length > 0
        );

      if (dietaryItems.length === 0) {
        throw new Error(
          "No dietary labels were found"
        );
      }
    }
  );

  /*
   * Calorie information
   */

  await test(
    "Rocky Top contains calorie data",
    async () => {
      const allItems = [
        ...rockyGrouped.breakfast,
        ...rockyGrouped.lunch,
        ...rockyGrouped.dinner,
      ];

      const withCalories =
        allItems.filter(
          (item) =>
            typeof item.calories === "number"
        );

      if (withCalories.length === 0) {
        throw new Error(
          "No calorie data was found"
        );
      }
    }
  );

  /*
   * Meal periods should actually differ
   */

  await test(
    "Rocky Top meal periods are not identical",
    async () => {
      const breakfast = new Set(
        rockyGrouped.breakfast.map(
          (item) => item.id
        )
      );

      const lunch = new Set(
        rockyGrouped.lunch.map(
          (item) => item.id
        )
      );

      const dinner = new Set(
        rockyGrouped.dinner.map(
          (item) => item.id
        )
      );

      const sameBreakfastLunch =
        breakfast.size === lunch.size &&
        [...breakfast].every((id) =>
          lunch.has(id)
        );

      const sameLunchDinner =
        lunch.size === dinner.size &&
        [...lunch].every((id) =>
          dinner.has(id)
        );

      if (
        sameBreakfastLunch &&
        sameLunchDinner
      ) {
        throw new Error(
          "Breakfast, lunch, and dinner appear identical"
        );
      }
    }
  );

  /*
   * Regular restaurant
   */

  await test(
    "1817 Taqueria regular menu",
    async () => {
      const url =
        `${BASE_URL}/api/menu?url=` +
        getEncodedMenuUrl(taqueriaUrl);

      const { response, data } =
        await requestJson(url);

      if (!response.ok) {
        throw new Error(
          `Expected HTTP 200, got ${response.status}`
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Regular restaurant should return an array"
        );
      }

      if (data.length === 0) {
        throw new Error(
          "1817 Taqueria returned no items"
        );
      }

      for (const item of data) {
        if (!item.name) {
          throw new Error(
            "Restaurant item missing name"
          );
        }

        if (!item.category) {
          throw new Error(
            `Item "${item.name}" missing category`
          );
        }
      }
    }
  );

  await test(
    "1817 Taqueria contains prices",
    async () => {
      const url =
        `${BASE_URL}/api/menu?url=` +
        getEncodedMenuUrl(taqueriaUrl);

      const { data } =
        await requestJson(url);

      const itemsWithPrices =
        data.filter(
          (item) =>
            typeof item.price === "string" &&
            item.price.startsWith("$")
        );

      if (itemsWithPrices.length === 0) {
        throw new Error(
          "No valid prices found"
        );
      }
    }
  );

  /*
   * Error handling
   */

  await test(
    "Unknown dining hall returns 404",
    async () => {
      const { response } =
        await requestJson(
          `${BASE_URL}/api/menus/not-a-real-hall/current`
        );

      if (response.status !== 404) {
        throw new Error(
          `Expected HTTP 404, got ${response.status}`
        );
      }
    }
  );

  await test(
    "Missing menu URL returns 400",
    async () => {
      const { response } =
        await requestJson(
          `${BASE_URL}/api/menu`
        );

      if (response.status !== 400) {
        throw new Error(
          `Expected HTTP 400, got ${response.status}`
        );
      }
    }
  );

  /*
   * Summary
   */

  console.log("\n==============================");
  console.log(" Test Results");
  console.log("==============================");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log("==============================\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runTests();