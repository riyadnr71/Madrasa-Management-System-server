const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getSeatPlan,
} = require("../controllers/seatPlanController");

/* =========================================================
   GET SEAT PLAN
========================================================= */

router.get(
  "/",
  authMiddleware,
  getSeatPlan
);

module.exports = router;