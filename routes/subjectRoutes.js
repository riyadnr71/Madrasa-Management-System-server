const express = require("express");

const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  addSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");


/* =========================================================
   GET ALL SUBJECTS
========================================================= */

router.get(
  "/",
  authMiddleware,
  getSubjects
);


/* =========================================================
   ADD SUBJECT
========================================================= */

router.post(
  "/",
  authMiddleware,
  addSubject
);


/* =========================================================
   UPDATE SUBJECT
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  updateSubject
);


/* =========================================================
   DELETE SUBJECT
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  deleteSubject
);


module.exports = router;