const express = require("express");
const router = express.Router();

const upload = require("../utils/upload");
const authMiddleware = require("../middleware/authMiddleware");

const {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

router.get(
  "/",
  authMiddleware,
  getStudents
);

router.get(
  "/:id",
  authMiddleware,
  getStudentById
);

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  addStudent
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  updateStudent
);

router.delete(
  "/:id",
  authMiddleware,
  deleteStudent
);

module.exports = router;