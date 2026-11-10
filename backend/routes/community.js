// Community forum (Yik Yak style): anonymous posts, upvotes/downvotes,
// replies, and reports.
//
// Everything here requires a logged-in user so we can stop double voting
// and spam, but we NEVER send user ids or emails back to the app. That is
// what keeps posts anonymous.

const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../db");
const containsBadWords = require("../badwordsReviewer");

const router = express.Router();

// ---------- Settings ----------
const MAX_POST_LENGTH = 280;
const MAX_REPLY_LENGTH = 200;
const HIDE_AT_REPORTS = 3; // hidden once this many different users report it
const HIDE_AT_SCORE = -5;  // hidden once votes drop this low (Yik Yak rule)

// ---------- Database tables ----------
// Created here (not in db.js) so the community feature lives in one file.
db.exec(`
  CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS community_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- target_type is 'post' or 'reply'. One vote per user per thing.
  CREATE TABLE IF NOT EXISTS community_votes (
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    value INTEGER NOT NULL CHECK (value IN (-1, 1)),
    PRIMARY KEY (target_type, target_id, user_id)
  );

  -- One report per user per thing.
  CREATE TABLE IF NOT EXISTS community_reports (
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (target_type, target_id, user_id)
  );
`);

// Photos are stored right in the database so there's no uploads folder to manage.
db.exec(`
  CREATE TABLE IF NOT EXISTS community_images (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

// Polls: a post can have 2-4 options, and each user picks one.
db.exec(`
  CREATE TABLE IF NOT EXISTS community_poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_poll_votes (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );
`);

// Older copies of the posts table are missing newer columns, so add them.
const postColumns = db.prepare("PRAGMA table_info(community_posts)").all();
if (!postColumns.some((column) => column.name === "image_id")) {
  db.exec("ALTER TABLE community_posts ADD COLUMN image_id TEXT");
}
if (!postColumns.some((column) => column.name === "tag")) {
  db.exec("ALTER TABLE community_posts ADD COLUMN tag TEXT");
}
// Optional dish rating attached to a post: the dish's name and "up" or "down".
if (!postColumns.some((column) => column.name === "dish_name")) {
  db.exec("ALTER TABLE community_posts ADD COLUMN dish_name TEXT");
}
if (!postColumns.some((column) => column.name === "dish_rating")) {
  db.exec("ALTER TABLE community_posts ADD COLUMN dish_rating TEXT");
}

// Dish ratings: one thumbs up/down per user, per dish, per hall, per day.
// Menus change daily, so the Menu screen only counts today's ratings.
// dish_key is the lowercased name so "BBQ Turkey Panini" and
// "bbq turkey panini" count as the same dish.
db.exec(`
  CREATE TABLE IF NOT EXISTS dish_ratings (
    user_id INTEGER NOT NULL,
    hall_id TEXT NOT NULL,
    dish_key TEXT NOT NULL,
    dish_name TEXT NOT NULL,
    day TEXT NOT NULL,
    value INTEGER NOT NULL CHECK (value IN (-1, 1)),
    post_id INTEGER,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (user_id, hall_id, dish_key, day)
  );
`);

// Dining hall tags a post can have (same ids the crowd meter and reviews use).
const TAGS = new Set(["rocky-top", "stokely", "southern-kitchen", "general"]);
const HALL_TAGS = new Set(["rocky-top", "stokely", "southern-kitchen"]);
const MAX_POLL_OPTION_LENGTH = 50;
const MAX_DISH_NAME_LENGTH = 80;

// Today's date in Knoxville as "YYYY-MM-DD", so ratings reset at local midnight.
function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

const dishKey = (name) => name.trim().toLowerCase().replace(/\s+/g, " ");

// ---------- Login check (same as the other routes) ----------
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

// Checks text from the app. Returns an error message, or null if it's fine.
function checkText(text, maxLength) {
  if (typeof text !== "string" || !text.trim()) return "Write something first";
  if (text.trim().length > maxLength) return `Keep it under ${maxLength} characters`;
  if (containsBadWords(text)) return "That contains inappropriate language";
  return null;
}

// ---------- Shared SQL pieces ----------
// Score = upvotes minus downvotes. myVote = this user's vote (1, -1 or 0).
const SCORE_SQL = (type, alias) => `
  COALESCE((SELECT SUM(value) FROM community_votes
            WHERE target_type = '${type}' AND target_id = ${alias}.id), 0) AS score,
  COALESCE((SELECT value FROM community_votes
            WHERE target_type = '${type}' AND target_id = ${alias}.id AND user_id = @userId), 0) AS myVote,
  (SELECT COUNT(*) FROM community_reports
   WHERE target_type = '${type}' AND target_id = ${alias}.id) AS reportCount,
  EXISTS (SELECT 1 FROM community_reports
          WHERE target_type = '${type}' AND target_id = ${alias}.id AND user_id = @userId) AS reportedByMe
`;

// Turns a database row into what the app sees. No user ids leave the server.
function toPublic(row) {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    score: row.score,
    myVote: row.myVote,
    isMine: row.user_id === row.viewerId,
    image: row.image_id ?? null,
    tag: row.tag ?? null,
    ...(row.dish_name !== undefined && {
      dish: row.dish_name ? { name: row.dish_name, rating: row.dish_rating } : null,
    }),
    ...(row.replyCount !== undefined && { replyCount: row.replyCount }),
    ...(row.isOP !== undefined && { isOP: !!row.isOP }),
  };
}

// A post's poll with vote counts, or null if it has no poll.
function getPoll(postId, userId) {
  const options = db
    .prepare(`
      SELECT o.id, o.text,
        (SELECT COUNT(*) FROM community_poll_votes v WHERE v.option_id = o.id) AS votes
      FROM community_poll_options o
      WHERE o.post_id = ?
      ORDER BY o.position
    `)
    .all(postId);
  if (options.length === 0) return null;

  const mine = db
    .prepare("SELECT option_id FROM community_poll_votes WHERE post_id = ? AND user_id = ?")
    .get(postId, userId);

  return {
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    myChoice: mine ? mine.option_id : null,
  };
}

// A post as the app sees it, including its poll.
function publicPost(row, userId) {
  return { ...toPublic(row), poll: getPoll(row.id, userId) };
}

function isHidden(row) {
  return row.reportCount >= HIDE_AT_REPORTS || row.score <= HIDE_AT_SCORE || row.reportedByMe;
}

function getPost(postId, userId) {
  return db
    .prepare(`
      SELECT p.*, @userId AS viewerId, ${SCORE_SQL("post", "p")},
        (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) AS replyCount
      FROM community_posts p
      WHERE p.id = @postId
    `)
    .get({ postId, userId });
}

// ---------- Routes ----------

// GET /api/community/posts?sort=new  (or sort=hot)   optional: &tag=stokely
router.get("/community/posts", requireUser, (req, res) => {
  const rows = db
    .prepare(`
      SELECT p.*, @userId AS viewerId, ${SCORE_SQL("post", "p")},
        (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) AS replyCount
      FROM community_posts p
      ORDER BY p.created_at DESC
      LIMIT 200
    `)
    .all({ userId: req.userId });

  let posts = rows.filter((row) => !isHidden(row));

  if (TAGS.has(req.query.tag)) {
    posts = posts.filter((row) => row.tag === req.query.tag);
  }

  if (req.query.sort === "hot") {
    // Hot = score, slowly losing value as the post gets older.
    const hotness = (row) => {
      const hoursOld = (Date.now() - Date.parse(row.created_at)) / 3600000;
      return (row.score + 1) / Math.pow(hoursOld + 2, 1.5);
    };
    posts.sort((a, b) => hotness(b) - hotness(a));
  }

  res.json(posts.slice(0, 100).map((row) => publicPost(row, req.userId)));
});

// POST /api/community/images
// Body is the photo as base64 text (Content-Type: text/plain). Returns { image: id }.
const IMAGE_TYPES = [
  { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", magic: [0x47, 0x49, 0x46] },
  { mime: "image/webp", magic: [0x52, 0x49, 0x46, 0x46] },
];

router.post(
  "/community/images",
  requireUser,
  express.text({ type: "text/plain", limit: "12mb" }),
  (req, res) => {
    if (typeof req.body !== "string" || !req.body) {
      return res.status(400).json({ error: "No photo received" });
    }
    const base64 = req.body.replace(/^data:[^,]*,/, ""); // strip "data:image/...;base64," if present
    const data = Buffer.from(base64, "base64");
    if (data.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: "That photo is too big (8 MB max)" });
    }
    const type = IMAGE_TYPES.find((t) => t.magic.every((byte, i) => data[i] === byte));
    if (!type) return res.status(400).json({ error: "Only JPG, PNG, GIF or WEBP photos" });

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO community_images (id, user_id, mime, data) VALUES (?, ?, ?, ?)")
      .run(id, req.userId, type.mime, data);
    res.status(201).json({ image: id });
  }
);

// GET /api/community/images/:id   -> the photo itself (used by <Image>)
router.get("/community/images/:id", (req, res) => {
  const image = db.prepare("SELECT mime, data FROM community_images WHERE id = ?").get(req.params.id);
  if (!image) return res.status(404).end();
  res.set("Content-Type", image.mime);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(image.data);
});

// POST /api/community/posts   body: { text, image?, tag?, pollOptions?, dish? }
// A post needs text, a photo, or both. A poll needs text (the question)
// and 2-4 options. dish is optional: { name, rating: "up" | "down" }, and
// only allowed when the post is tagged with a dining hall.
router.post("/community/posts", requireUser, (req, res) => {
  const imageId = typeof req.body?.image === "string" ? req.body.image : null;
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const tag = req.body?.tag ?? null;
  const rawOptions = req.body?.pollOptions;
  const rawDish = req.body?.dish ?? null;

  if (tag !== null && !TAGS.has(tag)) {
    return res.status(400).json({ error: "Pick a valid tag" });
  }

  let dish = null;
  if (rawDish !== null) {
    const name = typeof rawDish.name === "string" ? rawDish.name.trim() : "";
    if (!HALL_TAGS.has(tag)) {
      return res.status(400).json({ error: "Tag a dining hall to rate a dish" });
    }
    if (!name || name.length > MAX_DISH_NAME_LENGTH) {
      return res.status(400).json({ error: "Pick a dish to rate" });
    }
    if (!["up", "down"].includes(rawDish.rating)) {
      return res.status(400).json({ error: "Choose thumbs up or thumbs down" });
    }
    if (containsBadWords(name)) {
      return res.status(400).json({ error: "That contains inappropriate language" });
    }
    dish = { name, rating: rawDish.rating };
  }

  let pollOptions = null;
  if (rawOptions !== undefined && rawOptions !== null) {
    if (!Array.isArray(rawOptions)) return res.status(400).json({ error: "Invalid poll" });
    pollOptions = rawOptions
      .map((option) => (typeof option === "string" ? option.trim() : ""))
      .filter((option) => option.length > 0);
    if (pollOptions.length < 2 || pollOptions.length > 4) {
      return res.status(400).json({ error: "A poll needs 2 to 4 options" });
    }
    for (const option of pollOptions) {
      const error = checkText(option, MAX_POLL_OPTION_LENGTH);
      if (error) return res.status(400).json({ error: `Poll option: ${error}` });
    }
    if (!text.trim()) return res.status(400).json({ error: "Add a question for your poll" });
  }

  if (imageId) {
    const owned = db
      .prepare("SELECT 1 FROM community_images WHERE id = ? AND user_id = ?")
      .get(imageId, req.userId);
    if (!owned) return res.status(400).json({ error: "Photo not found, try adding it again" });
  }
  if (!imageId || text.trim()) {
    const error = checkText(text, MAX_POST_LENGTH);
    if (error) return res.status(400).json({ error });
  }

  const postId = db.transaction(() => {
    const result = db
      .prepare(`
        INSERT INTO community_posts (user_id, text, image_id, tag, dish_name, dish_rating)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(req.userId, text.trim(), imageId, tag, dish?.name ?? null, dish?.rating ?? null);
    (pollOptions ?? []).forEach((option, position) => {
      db.prepare("INSERT INTO community_poll_options (post_id, text, position) VALUES (?, ?, ?)")
        .run(result.lastInsertRowid, option, position);
    });
    if (dish) {
      // Rating the same dish again today replaces your earlier rating.
      db.prepare(`
        INSERT INTO dish_ratings (user_id, hall_id, dish_key, dish_name, day, value, post_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, hall_id, dish_key, day) DO UPDATE SET
          dish_name = excluded.dish_name,
          value = excluded.value,
          post_id = excluded.post_id,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `).run(
        req.userId,
        tag,
        dishKey(dish.name),
        dish.name,
        todayKey(),
        dish.rating === "up" ? 1 : -1,
        result.lastInsertRowid,
      );
    }
    return result.lastInsertRowid;
  })();

  res.status(201).json(publicPost(getPost(postId, req.userId), req.userId));
});

// POST /api/community/posts/:id/poll   body: { optionId }
// Pick (or change) your answer on a poll.
router.post("/community/posts/:id/poll", requireUser, (req, res) => {
  const post = getPost(Number(req.params.id), req.userId);
  if (!post || isHidden(post)) return res.status(404).json({ error: "Post not found" });

  const optionId = req.body?.optionId;
  const option = db
    .prepare("SELECT id FROM community_poll_options WHERE id = ? AND post_id = ?")
    .get(optionId, post.id);
  if (!option) return res.status(400).json({ error: "Pick one of the poll options" });

  db.prepare(`
    INSERT INTO community_poll_votes (post_id, user_id, option_id) VALUES (?, ?, ?)
    ON CONFLICT (post_id, user_id) DO UPDATE SET option_id = excluded.option_id
  `).run(post.id, req.userId, option.id);

  res.json(getPoll(post.id, req.userId));
});

// GET /api/community/posts/:id   -> the post and its replies
router.get("/community/posts/:id", requireUser, (req, res) => {
  const post = getPost(Number(req.params.id), req.userId);
  if (!post || isHidden(post)) {
    return res.status(404).json({ error: "Post not found" });
  }

  const replies = db
    .prepare(`
      SELECT r.*, @userId AS viewerId, ${SCORE_SQL("reply", "r")},
        (r.user_id = @postAuthor) AS isOP
      FROM community_replies r
      WHERE r.post_id = @postId
      ORDER BY r.created_at ASC
    `)
    .all({ postId: post.id, userId: req.userId, postAuthor: post.user_id })
    .filter((row) => !isHidden(row));

  res.json({ post: publicPost(post, req.userId), replies: replies.map(toPublic) });
});

// DELETE /api/community/posts/:id   (only your own post)
router.delete("/community/posts/:id", requireUser, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare("SELECT user_id, image_id FROM community_posts WHERE id = ?").get(postId);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.user_id !== req.userId) {
    return res.status(403).json({ error: "You can only delete your own posts" });
  }

  db.transaction(() => {
    const replyIds = db
      .prepare("SELECT id FROM community_replies WHERE post_id = ?")
      .all(postId)
      .map((r) => r.id);
    for (const id of replyIds) {
      db.prepare("DELETE FROM community_votes WHERE target_type = 'reply' AND target_id = ?").run(id);
      db.prepare("DELETE FROM community_reports WHERE target_type = 'reply' AND target_id = ?").run(id);
    }
    db.prepare("DELETE FROM community_replies WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM community_votes WHERE target_type = 'post' AND target_id = ?").run(postId);
    db.prepare("DELETE FROM community_reports WHERE target_type = 'post' AND target_id = ?").run(postId);
    db.prepare("DELETE FROM community_poll_votes WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM community_poll_options WHERE post_id = ?").run(postId);
    // Deleting a post also takes back the dish rating it made.
    db.prepare("DELETE FROM dish_ratings WHERE post_id = ?").run(postId);
    db.prepare("DELETE FROM community_posts WHERE id = ?").run(postId);
    if (post.image_id) {
      db.prepare("DELETE FROM community_images WHERE id = ?").run(post.image_id);
    }
  })();

  res.json({ message: "Post deleted" });
});

// POST /api/community/posts/:id/replies   body: { text }
router.post("/community/posts/:id/replies", requireUser, (req, res) => {
  const post = getPost(Number(req.params.id), req.userId);
  if (!post || isHidden(post)) return res.status(404).json({ error: "Post not found" });

  const error = checkText(req.body?.text, MAX_REPLY_LENGTH);
  if (error) return res.status(400).json({ error });

  db.prepare("INSERT INTO community_replies (post_id, user_id, text) VALUES (?, ?, ?)")
    .run(post.id, req.userId, req.body.text.trim());

  res.status(201).json({ message: "Reply posted" });
});

// GET /api/dishes/ratings?hall=rocky-top
// Today's thumbs up/down totals for every rated dish at one hall:
// [{ name, up, down, total, percentLiked, myRating }]
router.get("/dishes/ratings", requireUser, (req, res) => {
  const hall = req.query.hall;
  if (!HALL_TAGS.has(hall)) {
    return res.status(400).json({ error: "Pick a valid dining hall" });
  }

  const rows = db
    .prepare(`
      SELECT dish_key,
        MAX(dish_name) AS name,
        SUM(value = 1) AS up,
        SUM(value = -1) AS down,
        MAX(CASE WHEN user_id = @userId THEN value END) AS mine
      FROM dish_ratings
      WHERE hall_id = @hall AND day = @day
      GROUP BY dish_key
      ORDER BY dish_key
    `)
    .all({ hall, day: todayKey(), userId: req.userId });

  res.json(
    rows.map((row) => {
      const total = row.up + row.down;
      return {
        name: row.name,
        up: row.up,
        down: row.down,
        total,
        percentLiked: total ? Math.round((row.up / total) * 100) : 0,
        myRating: row.mine === 1 ? "up" : row.mine === -1 ? "down" : null,
      };
    })
  );
});

// Makes sure a post or reply exists before voting on / reporting it.
function targetExists(type, id) {
  const table = type === "post" ? "community_posts" : "community_replies";
  return !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
}

// POST /api/community/vote   body: { type: "post" | "reply", id, value: 1 | -1 | 0 }
// value 0 removes your vote.
router.post("/community/vote", requireUser, (req, res) => {
  const { type, id, value } = req.body ?? {};
  if (!["post", "reply"].includes(type) || !Number.isInteger(id) || ![1, -1, 0].includes(value)) {
    return res.status(400).json({ error: "Invalid vote" });
  }
  if (!targetExists(type, id)) return res.status(404).json({ error: "Not found" });

  if (value === 0) {
    db.prepare("DELETE FROM community_votes WHERE target_type = ? AND target_id = ? AND user_id = ?")
      .run(type, id, req.userId);
  } else {
    db.prepare(`
      INSERT INTO community_votes (target_type, target_id, user_id, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (target_type, target_id, user_id) DO UPDATE SET value = excluded.value
    `).run(type, id, req.userId, value);
  }

  const { score } = db
    .prepare("SELECT COALESCE(SUM(value), 0) AS score FROM community_votes WHERE target_type = ? AND target_id = ?")
    .get(type, id);

  res.json({ score, myVote: value });
});

// POST /api/community/report   body: { type: "post" | "reply", id, reason? }
router.post("/community/report", requireUser, (req, res) => {
  const { type, id } = req.body ?? {};
  const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 100) : null;
  if (!["post", "reply"].includes(type) || !Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid report" });
  }
  if (!targetExists(type, id)) return res.status(404).json({ error: "Not found" });

  db.prepare(`
    INSERT OR IGNORE INTO community_reports (target_type, target_id, user_id, reason)
    VALUES (?, ?, ?, ?)
  `).run(type, id, req.userId, reason);

  res.status(201).json({ message: "Thanks, we'll take a look" });
});

module.exports = router;
