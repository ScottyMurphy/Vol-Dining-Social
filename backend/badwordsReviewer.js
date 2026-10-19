const fs = require("fs");
const path = require("path");

const badWords = new Set(
  fs
    .readFileSync(path.join(__dirname, "data", "badwords.txt"), "utf8")
    .split(/\r?\n/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 0)
);

function containsBadWords(text) {
  const words = text.toLowerCase().split(/[^a-z0-9']+/);
  return words.some((word) => badWords.has(word));
}

module.exports = containsBadWords;
