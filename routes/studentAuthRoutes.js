const express = require("express");

const router = express.Router();

const {
  studentLogin,
  getStudentMe,
  getStudentFees,
  getStudentResults,
} = require("../controllers/studentAuthController");

const studentAuthMiddleware = require("../middleware/studentAuthMiddleware");

/* =========================================================
   STUDENT LOGIN
========================================================= */

router.post(
  "/login",
  studentLogin
);

/* =========================================================
   CURRENT STUDENT PROFILE
========================================================= */

router.get(
  "/me",
  studentAuthMiddleware,
  getStudentMe
);

/* =========================================================
   CURRENT STUDENT FEES
========================================================= */

router.get(
  "/:id/fees",
  studentAuthMiddleware,
  getStudentFees
);

/* =========================================================
   CURRENT STUDENT RESULTS
========================================================= */

router.get(
  "/:id/results",
  studentAuthMiddleware,
  getStudentResults
);

module.exports = router;