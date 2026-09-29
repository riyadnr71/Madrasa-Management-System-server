const express = require("express");

const router = express.Router();

const {
  scanAttendance,
  getTodayAttendance,
  getStudentAttendance,
  getClassAttendance,
  markLeave,
  updateAttendance,
  deleteAttendance,
  getAttendanceReport,
} = require("../controllers/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");

const teacherAuthMiddleware = require("../middleware/teacherAuthMiddleware");

const {
  teacherAttendanceAccess,
  teacherAttendanceView,
} = require("../middleware/attendanceMiddleware");

/* =========================================================
   ADMIN
========================================================= */

/* SCAN */

router.post(
  "/admin/scan",
  authMiddleware,
  scanAttendance
);

/* TODAY */

router.get(
  "/admin/today",
  authMiddleware,
  getTodayAttendance
);

/* REPORT */

router.get(
  "/admin/report",
  authMiddleware,
  getAttendanceReport
);

/* STUDENT */

router.get(
  "/admin/student/:studentId",
  authMiddleware,
  getStudentAttendance
);

/* CLASS */

router.get(
  "/admin/class/:className",
  authMiddleware,
  getClassAttendance
);

/* LEAVE */

router.post(
  "/admin/leave",
  authMiddleware,
  markLeave
);

/* UPDATE */

router.put(
  "/admin/:id",
  authMiddleware,
  updateAttendance
);

/* DELETE */

router.delete(
  "/admin/:id",
  authMiddleware,
  deleteAttendance
);

/* =========================================================
   TEACHER
========================================================= */

/* SCAN */

router.post(
  "/teacher/scan",
  teacherAuthMiddleware,
  teacherAttendanceAccess,
  scanAttendance
);

/* TODAY */

router.get(
  "/teacher/today",
  teacherAuthMiddleware,
  teacherAttendanceView,
  getTodayAttendance
);

/* REPORT */

router.get(
  "/teacher/report",
  teacherAuthMiddleware,
  teacherAttendanceView,
  getAttendanceReport
);

/* STUDENT */

router.get(
  "/teacher/student/:studentId",
  teacherAuthMiddleware,
  teacherAttendanceView,
  getStudentAttendance
);

/* CLASS */

router.get(
  "/teacher/class/:className",
  teacherAuthMiddleware,
  teacherAttendanceView,
  getClassAttendance
);

module.exports = router;