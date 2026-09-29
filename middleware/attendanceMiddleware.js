const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const getTeacherFromDB = async (teacherMongoId) => {
  if (!teacherMongoId || !ObjectId.isValid(teacherMongoId)) {
    return null;
  }

  const db = getDB();

  return await db.collection("teachers").findOne({
    _id: new ObjectId(teacherMongoId),
  });
};

/* =========================================================
   TEACHER ATTENDANCE SCAN ACCESS
========================================================= */

const teacherAttendanceAccess = async (req, res, next) => {
  try {
    const teacherMongoId = req.teacher?.teacherId;

    if (!teacherMongoId) {
      return res.status(401).json({
        success: false,
        message: "Teacher authentication required.",
      });
    }

    const teacher = await getTeacherFromDB(teacherMongoId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    if (
      teacher.status &&
      String(teacher.status).toLowerCase() !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message: "Teacher account is inactive.",
      });
    }

    const allowed =
      teacher?.permissions?.attendance?.scan === true;

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to scan attendance.",
      });
    }

    req.teacherData = teacher;
    req.attendanceUserType = "teacher";

    next();
  } catch (error) {
    console.error("Teacher Attendance Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify teacher attendance access.",
    });
  }
};

/* =========================================================
   TEACHER ATTENDANCE VIEW ACCESS
========================================================= */

const teacherAttendanceView = async (req, res, next) => {
  try {
    const teacherMongoId = req.teacher?.teacherId;

    if (!teacherMongoId) {
      return res.status(401).json({
        success: false,
        message: "Teacher authentication required.",
      });
    }

    const teacher = await getTeacherFromDB(teacherMongoId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    if (
      teacher.status &&
      String(teacher.status).toLowerCase() !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message: "Teacher account is inactive.",
      });
    }

    const allowed =
      teacher?.permissions?.attendance?.view === true;

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view attendance.",
      });
    }

    req.teacherData = teacher;
    req.attendanceUserType = "teacher";

    next();
  } catch (error) {
    console.error("Teacher Attendance View Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify teacher attendance access.",
    });
  }
};

module.exports = {
  teacherAttendanceAccess,
  teacherAttendanceView,
};