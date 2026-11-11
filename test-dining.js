const BASE_URL = "http://localhost:4000";

async function testJsonEndpoint(name, url, validate) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    validate(data);
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`      ${error.message}`);
  }
}

async function runTests() {
  console.log("Running dining API tests...\n");
  await testJsonEndpoint(
    "Health endpoint",
    `${BASE_URL}/api/health`,
    (data) => {
      if (data.ok !== true) {
        throw new Error("Expected { ok: true }");
      }
    }
  );
  await testJsonEndpoint(
    "Rocky Top current menu",
    `${BASE_URL}/api/menus/rocky-top/current`,
    (data) => {
      if (data.id !== "rocky-top") {
        throw new Error("Wrong hall ID");
      }
      if (!["breakfast", "lunch", "dinner"].includes(data.meal)) {
        throw new Error("Invalid meal");
      }
      if (!Array.isArray(data.items)) {
        throw new Error("items is not an array");
      }
      if (data.items.length === 0) {
        throw new Error("No Rocky Top menu items returned");
      }
    }
  );
  await testJsonEndpoint(
    "Stokely current menu",
    `${BASE_URL}/api/menus/stokely/current`,
    (data) => {
      if (data.id !== "stokely") {
        throw new Error("Wrong hall ID");
      }
      if (!["breakfast", "lunch", "dinner"].includes(data.meal)) {
        throw new Error("Invalid meal");
      }
      if (!Array.isArray(data.items)) {
        throw new Error("items is not an array");
      }
      if (data.items.length === 0) {
        throw new Error("No Stokely menu items returned");
      }
    }
  );
  const rockyTopUrl = encodeURIComponent(
    "https://dining.utk.edu/vendor/rocky-top-dining-hall/"
  );
  await testJsonEndpoint(
    "Rocky Top grouped menu",
    `${BASE_URL}/api/menu?url=${rockyTopUrl}`,
    (data) => {
      for (const meal of ["breakfast", "lunch", "dinner"]) {
        if (!Array.isArray(data[meal])) {
          throw new Error(`${meal} is missing or is not an array`);
        }
      }
      const allItems = [
        ...data.breakfast,
        ...data.lunch,
        ...data.dinner,
      ];
      if (allItems.length === 0) {
        throw new Error("Grouped menu returned no items");
      }
      const sample = allItems[0];
      if (!sample.name) {
        throw new Error("Menu item missing name");
      }
      if (!sample.category) {
        throw new Error("Menu item missing category");
      }
      if (!Array.isArray(sample.dietary)) {
        throw new Error("dietary is not an array");
      }
    }
  );

  const taqueriaUrl = encodeURIComponent(
    "https://dining.utk.edu/locations-and-menus/1817-taqueria-menu/"
  );
  await testJsonEndpoint(
    "Regular restaurant menu",
    `${BASE_URL}/api/menu?url=${taqueriaUrl}`,
    (data) => {
      if (!Array.isArray(data)) {
        throw new Error(
          "Expected regular restaurant menu to return an array"
        );
      }

      if (data.length === 0) {
        throw new Error("Restaurant returned no menu items");
      }

      const sample = data[0];

      if (!sample.name) {
        throw new Error("Restaurant item missing name");
      }

      if (!sample.category) {
        throw new Error("Restaurant item missing category");
      }
    }
  );

  console.log("\nTests finished.");
}

runTests();