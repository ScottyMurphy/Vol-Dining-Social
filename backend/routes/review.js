const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

//Find the bad words file
const badWordsPath = path.join(__dirname, "../data/badwords.txt");

//Read the bad words from the file
const badWords = fs
  .readFileSync(badWordsPath, "utf8")
  .split(/\r?\n/)
  .map(word => word.trim().toLowerCase())
  .filter(word => word.length > 0);

//Checks a review to see if it contains a bad word
function containsBadWords(text) {
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    if (badWords.includes(word)) {
      return true;
    }
  }

  return false;
}

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