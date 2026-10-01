// Food menus for each dining hall.
//
// NOTE: These items are placeholder/sample data (seeded from the dishes used in
// the frontend review mocks). Replace them with the real UTK Dining menus, or
// swap this file's data for a scraper/DB lookup later - the exported shape can
// stay the same.

const menus = {
  "rocky-top": {
    id: "rocky-top",
    name: "Rocky Top",
    meals: {
      breakfast: [
        { name: "Scrambled Eggs", category: "Hot Line", calories: 140 },
        { name: "Bacon", category: "Hot Line", calories: 90 },
        { name: "Pancakes", category: "Griddle", calories: 220 },
        { name: "Fresh Fruit Bowl", category: "Cold Bar", calories: 70 },
      ],
      lunch: [
        { name: "BBQ Turkey Panini", category: "Grill", calories: 520 },
        { name: "Grilled Chicken", category: "Grill", calories: 310 },
        { name: "Mac and Cheese", category: "Comfort Line", calories: 380 },
        { name: "Garden Salad", category: "Salad Bar", calories: 90 },
      ],
      dinner: [
        { name: "BBQ Turkey Panini", category: "Grill", calories: 520 },
        { name: "Grilled Chicken", category: "Grill", calories: 310 },
        { name: "Mac and Cheese", category: "Comfort Line", calories: 380 },
        { name: "Steamed Broccoli", category: "Sides", calories: 50 },
        { name: "Brownie", category: "Dessert", calories: 260 },
      ],
    },
  },

  stokely: {
    id: "stokely",
    name: "Stokely",
    meals: {
      breakfast: [
        { name: "Breakfast Burrito", category: "Grill", calories: 430 },
        { name: "Oatmeal", category: "Hot Line", calories: 160 },
        { name: "Hash Browns", category: "Sides", calories: 150 },
        { name: "Yogurt Parfait", category: "Cold Bar", calories: 190 },
      ],
      lunch: [
        { name: "Chicken Tenders", category: "Fryer", calories: 450 },
        { name: "Pasta", category: "Pasta Station", calories: 400 },
        { name: "French Fries", category: "Fryer", calories: 320 },
        { name: "Garden Salad", category: "Salad Bar", calories: 90 },
      ],
      dinner: [
        { name: "Chicken Tenders", category: "Fryer", calories: 450 },
        { name: "Pasta", category: "Pasta Station", calories: 400 },
        { name: "Garlic Bread", category: "Sides", calories: 170 },
        { name: "Chocolate Chip Cookie", category: "Dessert", calories: 210 },
      ],
    },
  },
};

/** All dining halls with their full menus. */
function getAllMenus() {
  return Object.values(menus);
}

/** One dining hall's menu by id ("rocky-top", "stokely"), or null if unknown. */
function getMenu(diningHallId) {
  return menus[diningHallId] || null;
}

module.exports = { menus, getAllMenus, getMenu };
