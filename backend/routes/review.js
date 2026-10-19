const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const containsBadWords = require("../badwordsReviewer");

const router = express.Router();
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

function getReviewSummary(locationId, userId) {
  const summary = db
    .prepare(`
      SELECT AVG(cleanliness) AS average_cleanliness,
             AVG(service) AS average_service,
             COUNT(*) AS review_count
      FROM dining_hall_reviews
      WHERE location_id = ?
    `)
    .get(locationId);
  const ownReview = db
    .prepare(`
      SELECT cleanliness, service
      FROM dining_hall_reviews
      WHERE location_id = ? AND user_id = ?
    `)
    .get(locationId, userId);

  return {
    averageCleanliness: summary.average_cleanliness,
    averageService: summary.average_service,
    reviewCount: summary.review_count,
    myReview: ownReview ?? null,
  };
}

router.get("/reviews/:locationId", requireUser, (req, res) => {
  const { locationId } = req.params;
  if (!locations.has(locationId)) {
    return res.status(404).json({ error: "Dining hall not found" });
  }

  return res.json(getReviewSummary(locationId, req.userId));
});

router.post("/reviews/:locationId", requireUser, (req, res) => {
  const { locationId } = req.params;
  if (!locations.has(locationId)) {
    return res.status(404).json({ error: "Dining hall not found" });
  }

  const { cleanliness, service } = req.body ?? {};
  if (
    !Number.isInteger(cleanliness) ||
    cleanliness < 1 ||
    cleanliness > 5 ||
    !Number.isInteger(service) ||
    service < 1 ||
    service > 5
  ) {
    return res.status(400).json({ error: "Choose a 1-5 star rating for cleanliness and service" });
  }

  db.prepare(`
    INSERT INTO dining_hall_reviews (location_id, user_id, cleanliness, service, submitted_at)
    VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT (location_id, user_id)
    DO UPDATE SET cleanliness = excluded.cleanliness,
                  service = excluded.service,
                  submitted_at = excluded.submitted_at
  `).run(locationId, req.userId, cleanliness, service);

  return res.status(201).json({
    message: "Dining hall review saved",
    ...getReviewSummary(locationId, req.userId),
  });
});

//Receives a review and checks it before allowing it to be posted
router.post("/reviews", (req, res) => {
  const review = req.body.review?.trim();

  //Make sure the review is not empty
  if (!review) {
    return res.status(400).json({ error: "Review is required" });
  }

  //Do not allow the review if it contains a bad word
  if (containsBadWords(review)) {
    return res.status(400).json({ error: "Review contains inappropriate language" });
  }

  //The review passed the check
  res.status(201).json({
    message: "Review accepted",
    review: review
  });
});

module.exports = router;