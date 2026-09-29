const express = require("express");

const router = express.Router();

const {
  teacherLogin,
  getTeacherMe,
} = require("../controllers/teacherAuthController");

const teacherAuthMiddleware = require("../middleware/teacherAuthMiddleware");

// Teacher Login
router.post("/login", teacherLogin);

// Current Teacher
router.get(
  "/me",
  teacherAuthMiddleware,
  getTeacherMe
);

module.exports = router;