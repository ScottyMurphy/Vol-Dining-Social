const Database = require("better-sqlite3");
const db = new Database("users.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS crowd_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    reported_at TEXT NOT NULL,
    UNIQUE (location_id, user_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS dining_hall_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    cleanliness INTEGER NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
    service INTEGER NOT NULL CHECK (service BETWEEN 1 AND 5),
    submitted_at TEXT NOT NULL,
    UNIQUE (location_id, user_id)
  )
`);

module.exports = db;