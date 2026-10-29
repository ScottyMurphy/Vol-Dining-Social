require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const crowdRoutes = require("./routes/crowd");
const reviewRoutes = require("./routes/review");
const communityRoutes = require("./routes/community");

const app = express();
const {
  scrapeLocations,
  scrapeMenu,
} = require("./scraper/utkDining");
const { getAllMenus, getMenu } = require("./menus");

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/dining", async (req, res) => {
  try {
    const locations = await scrapeLocations();
    res.json(locations);
  } catch (error) {
    console.error("DINING SCRAPER ERROR:", error);

    res.status(500).json({
      error: "Failed to retrieve dining information",
      details: error.message,
    });
  }
});
// Per-hall breakfast/lunch/dinner menus; the app picks the meal by time of day.
app.get("/api/menus", (req, res) => res.json(getAllMenus()));
app.get("/api/menus/:hallId", (req, res) => {
  const menu = getMenu(req.params.hallId);

  if (!menu) {
    return res.status(404).json({ error: "Unknown dining hall" });
  }

  res.json(menu);
});

app.use("/api", authRoutes);
app.use("/api", crowdRoutes);
app.use("/api", reviewRoutes);
app.use("/api", communityRoutes);

app.get("/api/menu", async (req, res) => {
  try {
    const menuUrl = req.query.url;

    if (!menuUrl) {
      return res.status(400).json({
        error: "Menu URL is required",
      });
    }

    const menu = await scrapeMenu(menuUrl);

    res.json(menu);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to retrieve menu",
    });
  }
});

app.listen(4000, () =>
  console.log("Backend running on port 4000")
);
