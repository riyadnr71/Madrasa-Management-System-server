const express = require("express");

const router = express.Router();

const {
  getPublicNotices,
} = require("../controllers/noticeController");

// Public - No Login Required
router.get("/", getPublicNotices);

module.exports = router;