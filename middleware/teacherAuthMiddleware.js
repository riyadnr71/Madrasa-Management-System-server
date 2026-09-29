// middleware/teacherAuthMiddleware.js

const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const teacherAuthMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Teacher authentication required.",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.type !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Teacher access only.",
      });
    }

    if (
      !decoded.teacherId ||
      !ObjectId.isValid(decoded.teacherId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid teacher token.",
      });
    }

    const db = getDB();

    const teacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(decoded.teacherId),
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher account not found.",
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

    req.teacher = decoded;
    req.teacherData = teacher;

    next();
  } catch (error) {
    console.error(
      "teacherAuthMiddleware error:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired teacher token.",
    });
  }
};

module.exports = teacherAuthMiddleware;