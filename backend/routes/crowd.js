const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const crowdLevels = ["low", "medium", "high", "very-high"];
const locations = new Set(["rocky-top", "stokely", "southern-kitchen"]);

function requireUser(req, res, next) {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication is required" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Authentication is not configured" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.userId !== "number") {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

router.get("/crowd/:locationId", requireUser, (req, res) => {
  const { locationId } = req.params;
  if (!locations.has(locationId)) {
    return res.status(404).json({ error: "Location not found" });
  }

  const summary = db
    .prepare(`
      SELECT AVG(level) AS average_level, COUNT(*) AS report_count, MAX(reported_at) AS updated_at
      FROM crowd_reports
      WHERE location_id = ? AND julianday(reported_at) >= julianday('now', '-2 hours')
    `)
    .get(locationId);
  const ownReport = db
    .prepare(`
      SELECT level
      FROM crowd_reports
      WHERE location_id = ? AND user_id = ? AND julianday(reported_at) >= julianday('now', '-2 hours')
    `)
    .get(locationId, req.userId);

  res.json({
    level: summary.average_level === null
      ? null
      : crowdLevels[Math.round(summary.average_level) - 1],
    reportCount: summary.report_count,
    myLevel: ownReport ? crowdLevels[ownReport.level - 1] : null,
    updatedAt: summary.updated_at,
  });
});

router.post("/crowd/:locationId", requireUser, (req, res) => {
  const { locationId } = req.params;
  if (!locations.has(locationId)) {
    return res.status(404).json({ error: "Location not found" });
  }

  const { level } = req.body;
  const levelNumber = crowdLevels.indexOf(level) + 1;
  if (!level || levelNumber === 0) {
    return res.status(400).json({ error: "Choose a valid crowd level" });
  }

  db.prepare(`
    INSERT INTO crowd_reports (location_id, user_id, level, reported_at)
    VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT (location_id, user_id)
    DO UPDATE SET level = excluded.level, reported_at = excluded.reported_at
  `).run(locationId, req.userId, levelNumber);

  res.status(201).json({ message: "Crowd report saved", level });
});

module.exports = router;
