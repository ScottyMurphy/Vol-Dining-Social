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

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/dining", async (req, res) => {
  try {
    const locations = await scrapeLocations();
    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to retrieve dining information",
    });
  }
});
app.use("/api", authRoutes);
app.use("/api", crowdRoutes);
app.use("/api", reviewRoutes);
app.use("/api", communityRoutes);

app.listen(4000, () => console.log("Backend running on port 4000"));

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