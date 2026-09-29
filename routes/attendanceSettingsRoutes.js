const express = require("express");

const router = express.Router();

const {
  getAttendanceSettings,
  updateAttendanceSettings,
} = require("../controllers/attendanceSettingsController");

const authMiddleware = require("../middleware/authMiddleware");

/* =========================================================
   GET SETTINGS
========================================================= */

router.get(
  "/",
  authMiddleware,
  getAttendanceSettings
);

/* =========================================================
   UPDATE SETTINGS
========================================================= */

router.put(
  "/",
  authMiddleware,
  updateAttendanceSettings
);

module.exports = router;