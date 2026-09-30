const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
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
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const allowedEmails = ["admin@test"];
  const isUtkEmail = email.endsWith("@vols.utk.edu");

  if (!isUtkEmail && !allowedEmails.includes(email)) {
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

module.exports = router;