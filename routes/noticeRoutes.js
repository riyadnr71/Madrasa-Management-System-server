const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/noticeUpload");

const {
  addNotice,
  getNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
} = require("../controllers/noticeController");

// Get all notices
router.get("/", authMiddleware, getNotices);

// Get single notice
router.get("/:id", authMiddleware, getNoticeById);

// Add notice
router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  addNotice
);

// Update notice
router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateNotice
);

// Delete notice
router.delete(
  "/:id",
  authMiddleware,
  deleteNotice
);

module.exports = router;