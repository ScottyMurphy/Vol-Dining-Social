require("dotenv").config();

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const crowdRoutes = require("./routes/crowd");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", authRoutes);
app.use("/api", crowdRoutes);

app.listen(4000, () => console.log("Backend running on port 4000"));