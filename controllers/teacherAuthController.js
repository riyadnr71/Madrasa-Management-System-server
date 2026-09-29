const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { getDB } = require("../config/db");

/* =========================================================
   TEACHER LOGIN
========================================================= */

const teacherLogin = async (
  req,
  res
) => {
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
        teacherId: String(
          teacherId
        ).trim(),
      });

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid Teacher ID or password.",
      });
    }

    if (!teacher.passwordHash) {
      return res.status(401).json({
        success: false,
        message:
          "Teacher password is not configured. Please contact the administration.",
      });
    }

    const passwordMatched =
      await bcrypt.compare(
        String(password),
        teacher.passwordHash
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid Teacher ID or password.",
      });
    }

    if (
      teacher.status &&
      String(
        teacher.status
      ).toLowerCase() !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This teacher account is currently inactive.",
      });
    }

    const JWT_SECRET =
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY;

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration error.",
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
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const {
      passwordHash,
      ...teacherData
    } = teacher;

    return res.status(200).json({
      success: true,
      message:
        "Teacher login successful.",

      token,

      teacher: {
        ...teacherData,
        _id: teacher._id,
      },
    });
  } catch (error) {
    console.error(
      "Teacher Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Teacher login failed.",
    });
  }
};

/* =========================================================
   GET CURRENT TEACHER
========================================================= */

const getTeacherMe = async (
  req,
  res
) => {
  try {
    const teacherMongoId =
      req.teacher?.teacherId;

    if (!teacherMongoId) {
      return res.status(401).json({
        success: false,
        message:
          "Teacher authentication required.",
      });
    }

    if (
      !ObjectId.isValid(
        teacherMongoId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid teacher authentication.",
      });
    }

    const db = getDB();

    const teacher =
      await db
        .collection("teachers")
        .findOne({
          _id: new ObjectId(
            teacherMongoId
          ),
        });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found.",
      });
    }

    const {
      passwordHash,
      ...teacherData
    } = teacher;

    return res.status(200).json({
      success: true,

      teacher: {
        ...teacherData,
        _id: teacher._id,
      },
    });
  } catch (error) {
    console.error(
      "Get Teacher Me Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load teacher profile.",
    });
  }
};

module.exports = {
  teacherLogin,
  getTeacherMe,
};