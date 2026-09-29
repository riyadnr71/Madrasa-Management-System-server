const express = require("express");

const {
  getTeacherAccess,
  updateTeacherPermissions,
  updateAcademicAccess,
  updateAttendanceAccess,
} = require("../controllers/teacherAccessController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET TEACHER ACCESS
|--------------------------------------------------------------------------
*/

router.get("/:teacherId", getTeacherAccess);

/*
|--------------------------------------------------------------------------
| UPDATE PERMISSIONS
|--------------------------------------------------------------------------
*/

router.patch(
  "/:teacherId/permissions",
  updateTeacherPermissions
);

/*
|--------------------------------------------------------------------------
| UPDATE ACADEMIC ACCESS
|--------------------------------------------------------------------------
*/

router.patch(
  "/:teacherId/academic",
  updateAcademicAccess
);

/*
|--------------------------------------------------------------------------
| UPDATE ATTENDANCE ACCESS
|--------------------------------------------------------------------------
*/

router.patch(
  "/:teacherId/attendance",
  updateAttendanceAccess
);

module.exports = router;