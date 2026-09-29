// controllers/teacherAuthController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const {
  normalizePermissions,
  normalizeAcademicAccess,
  normalizeAttendanceAccess,
} = require("../utils/teacherPermissions");

const getSafeTeacher = (teacher) => {
  if (!teacher) return null;

  const {
    passwordHash,
    ...safeTeacher
  } = teacher;

  return safeTeacher;
};

/**
 * TEACHER LOGIN
 */
const teacherLogin = async (req, res) => {
  try {
    const {
      teacherId,
      password,
    } = req.body;

    if (!teacherId || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Teacher ID and password are required.",
      });
    }

    const db = getDB();

    const teacher =
      await db.collection("teachers").findOne({
        teacherId: String(teacherId).trim(),
      });

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid teacher ID or password.",
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

    const passwordMatched =
      await bcrypt.compare(
        password,
        teacher.passwordHash
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid teacher ID or password.",
      });
    }

    const token = jwt.sign(
      {
        teacherId:
          teacher._id.toString(),

        teacherCode:
          teacher.teacherId,

        type: "teacher",
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Teacher login successful.",

      token,

      teacher: getSafeTeacher({
        ...teacher,

        permissions:
          normalizePermissions(
            teacher.permissions
          ),

        academicAccess:
          normalizeAcademicAccess(
            teacher.academicAccess
          ),

        attendanceAccess:
          normalizeAttendanceAccess(
            teacher.attendanceAccess
          ),
      }),
    });
  } catch (error) {
    console.error(
      "teacherLogin error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Teacher login failed.",
    });
  }
};

/**
 * GET LOGGED-IN TEACHER
 */
const getTeacherMe = async (
  req,
  res
) => {
  try {
    const teacherId =
      req.teacher?.teacherId;

    if (
      !teacherId ||
      !ObjectId.isValid(teacherId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid teacher authentication.",
      });
    }

    const db = getDB();

    const teacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(teacherId),
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    return res.status(200).json({
      success: true,

      teacher: getSafeTeacher({
        ...teacher,

        permissions:
          normalizePermissions(
            teacher.permissions
          ),

        academicAccess:
          normalizeAcademicAccess(
            teacher.academicAccess
          ),

        attendanceAccess:
          normalizeAttendanceAccess(
            teacher.attendanceAccess
          ),
      }),
    });
  } catch (error) {
    console.error(
      "getTeacherMe error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load teacher information.",
    });
  }
};

module.exports = {
  teacherLogin,
  getTeacherMe,
};