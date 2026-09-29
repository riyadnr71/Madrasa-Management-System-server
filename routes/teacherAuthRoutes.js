// routes/teacherAuthRoutes.js

const express = require("express");

const {
  teacherLogin,
  getTeacherMe,
} = require("../controllers/teacherAuthController");

const teacherAuthMiddleware = require("../middleware/teacherAuthMiddleware");

const router = express.Router();

router.post(
  "/login",
  teacherLogin
);

router.get(
  "/me",
  teacherAuthMiddleware,
  getTeacherMe
);

module.exports = router;