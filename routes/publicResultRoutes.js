
const express = require("express");

const router = express.Router();

const {
  getPublicResult,
} = require("../controllers/publicResultController");

/* =========================================================
   PUBLIC RESULT

   No authentication required.

   Example:

   /api/public-result
   ?studentId=2004
   &month=September
   &examName=Monthly%20Test
   &year=2026

========================================================= */

router.get(
  "/",
  getPublicResult
);

module.exports = router;

