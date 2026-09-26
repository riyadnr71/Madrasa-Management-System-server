const express = require("express");

const router = express.Router();

const upload = require("../utils/upload");

const authMiddleware = require("../middleware/authMiddleware");

const {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  resetStudentPassword,
  regenerateStudentQR,
  deleteStudent,
} = require("../controllers/studentController");

/* =========================================================
   GET ALL STUDENTS
========================================================= */

router.get(
  "/",
  authMiddleware,
  getStudents
);

/* =========================================================
   GET SINGLE STUDENT
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  getStudentById
);

/* =========================================================
   ADD STUDENT
========================================================= */

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  addStudent
);

/* =========================================================
   UPDATE STUDENT
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateStudent
);

/* =========================================================
   RESET STUDENT PASSWORD
========================================================= */

router.patch(
  "/:id/reset-password",
  authMiddleware,
  resetStudentPassword
);

/* =========================================================
   REGENERATE QR
========================================================= */

router.patch(
  "/:id/regenerate-qr",
  authMiddleware,
  regenerateStudentQR
);

/* =========================================================
   DELETE STUDENT
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  deleteStudent
);

module.exports = router;