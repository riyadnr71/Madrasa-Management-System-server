const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addResult,
  getResults,
  getResultById,
  updateResult,
  deleteResult,
} = require("../controllers/resultController");

/* =========================================================
   GET ALL RESULTS
   Admin only
========================================================= */

router.get(
  "/",
  authMiddleware,
  getResults
);

/* =========================================================
   ADD RESULT
   Admin only
========================================================= */

router.post(
  "/",
  authMiddleware,
  addResult
);

/* =========================================================
   GET SINGLE RESULT
   Admin only
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  getResultById
);

/* =========================================================
   UPDATE RESULT
   Admin only
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  updateResult
);

/* =========================================================
   DELETE RESULT
   Admin only
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  deleteResult
);

module.exports = router;