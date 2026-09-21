const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/teacherUpload");

const {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");

// =========================================================
// GET ALL TEACHERS
// =========================================================

router.get("/", authMiddleware, getTeachers);

// =========================================================
// GET SINGLE TEACHER
// =========================================================

router.get("/:id", authMiddleware, getTeacherById);

// =========================================================
// ADD TEACHER
// =========================================================

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  addTeacher
);

// =========================================================
// UPDATE TEACHER
// =========================================================

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateTeacher
);

// =========================================================
// DELETE TEACHER
// =========================================================

router.delete(
  "/:id",
  authMiddleware,
  deleteTeacher
);

module.exports = router;