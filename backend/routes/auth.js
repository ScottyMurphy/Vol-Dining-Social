const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();
const preferenceOptions = {
  dietary: new Set(["low_calorie", "vegan", "vegetarian"]),
  allergen: new Set(["gluten_free"]),
};

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

function getPreferences(userId) {
  const rows = db
    .prepare("SELECT category, preference FROM user_preferences WHERE user_id = ?")
    .all(userId);

  return rows.reduce(
    (preferences, row) => {
      preferences[row.category].push(row.preference);
      return preferences;
    },
    { dietary: [], allergen: [] },
  );
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isUtkEmail(email) {
  return /^[^@\s]+@vols\.utk\.edu$/.test(email);
}

router.post("/signup", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!isUtkEmail(email)) {
    return res.status(403).json({ error: "Please sign up with your @vols.utk.edu email" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash);

  res.status(201).json({ id: result.lastInsertRowid, email });
});

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const allowedEmails = ["admin@test"];

  if (!isUtkEmail(email) && !allowedEmails.includes(email)) {
    return res.status(403).json({ error: "Please sign up with your @vols.utk.edu email" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const passwordCorrect = user && (await bcrypt.compare(password, user.password_hash));

  if (!passwordCorrect) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: { id: user.id, email: user.email } });
});

router.get("/me", (req, res) => {
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

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }

  if (typeof payload !== "object" || typeof payload.userId !== "number") {
    return res.status(401).json({ error: "Invalid authentication token" });
  }

  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(payload.userId);
  if (!user) {
    return res.status(401).json({ error: "Invalid authentication token" });
  }

  return res.json({ user });
});

router.get("/preferences", requireUser, (req, res) => {
  return res.json(getPreferences(req.userId));
});

router.put("/preferences", requireUser, (req, res) => {
  const { dietary, allergen } = req.body ?? {};
  const selections = { dietary, allergen };

  for (const [category, allowedOptions] of Object.entries(preferenceOptions)) {
    const values = selections[category];
    if (
      !Array.isArray(values) ||
      values.some((value) => typeof value !== "string" || !allowedOptions.has(value)) ||
      new Set(values).size !== values.length
    ) {
      return res.status(400).json({ error: `Choose valid ${category} preferences` });
    }
  }

  const savePreferences = db.transaction(() => {
    db.prepare("DELETE FROM user_preferences WHERE user_id = ?").run(req.userId);
    const insert = db.prepare(
      "INSERT INTO user_preferences (user_id, category, preference) VALUES (?, ?, ?)",
    );
    for (const [category, values] of Object.entries(selections)) {
      for (const preference of values) {
        insert.run(req.userId, category, preference);
      }
    }
  });
  savePreferences();

  return res.json(getPreferences(req.userId));
});

module.exports = router;