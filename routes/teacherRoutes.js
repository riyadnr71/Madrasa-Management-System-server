// routes/teacherRoutes.js

const express = require("express");

const {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
} = require("../controllers/teacherController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

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
  addTeacher
);

router.put(
  "/:id",
  authMiddleware,
  updateTeacher
);

router.delete(
  "/:id",
  authMiddleware,
  deleteTeacher
);

router.patch(
  "/:id/reset-password",
  authMiddleware,
  resetTeacherPassword
);

module.exports = router;