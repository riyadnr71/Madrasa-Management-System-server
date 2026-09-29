const express = require("express");

const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const upload =
  require("../middleware/teacherUpload");

const {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
  updateTeacherPermissions,
  updateTeacherAssignments,
} = require("../controllers/teacherController");

/* =========================================================
   ADMIN TEACHER CRUD
========================================================= */

router.get(
  "/",
  authMiddleware,
  getTeachers
);

router.get(
  "/:id",
  authMiddleware,
  getTeacherById
);

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  addTeacher
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateTeacher
);

router.delete(
  "/:id",
  authMiddleware,
  deleteTeacher
);

/* =========================================================
   ADMIN TEACHER LOGIN CREDENTIALS
========================================================= */

router.patch(
  "/:id/reset-password",
  authMiddleware,
  resetTeacherPassword
);

/* =========================================================
   ADMIN TEACHER PERMISSIONS
========================================================= */

router.patch(
  "/:id/permissions",
  authMiddleware,
  updateTeacherPermissions
);

/* =========================================================
   ADMIN TEACHER CLASS + SUBJECT ASSIGNMENTS
========================================================= */

router.patch(
  "/:id/assignments",
  authMiddleware,
  updateTeacherAssignments
);

module.exports = router;