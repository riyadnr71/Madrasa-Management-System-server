// middleware/teacherPermissionMiddleware.js

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const {
  hasAcademicAccess,
  hasAttendanceAccess,
} = require("../utils/teacherPermissions");

/**
 * Load active teacher from database
 */
const loadTeacher = async (req, res) => {
  const teacherMongoId = req.teacher?.teacherId;

  if (!teacherMongoId) {
    res.status(401).json({
      success: false,
      message: "Teacher authentication required.",
    });

    return null;
  }

  if (!ObjectId.isValid(teacherMongoId)) {
    res.status(401).json({
      success: false,
      message: "Invalid teacher authentication.",
    });

    return null;
  }

  const db = getDB();

  const teacher = await db.collection("teachers").findOne({
    _id: new ObjectId(teacherMongoId),
  });

  if (!teacher) {
    res.status(404).json({
      success: false,
      message: "Teacher account not found.",
    });

    return null;
  }

  if (
    teacher.status &&
    String(teacher.status).toLowerCase() !== "active"
  ) {
    res.status(403).json({
      success: false,
      message: "Teacher account is inactive.",
    });

    return null;
  }

  req.teacherData = teacher;

  return teacher;
};

/**
 * Generic permission
 *
 * Example:
 *
 * teacherPermissionMiddleware("results", "add")
 */
const teacherPermissionMiddleware = (
  moduleName,
  action
) => {
  return async (req, res, next) => {
    try {
      const teacher = await loadTeacher(req, res);

      if (!teacher) return;

      const allowed =
        teacher?.permissions?.[moduleName]?.[action] === true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            `You do not have permission to ${action} ${moduleName}.`,
        });
      }

      next();
    } catch (error) {
      console.error(
        "teacherPermissionMiddleware error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Teacher permission check failed.",
      });
    }
  };
};

/**
 * Academic access middleware
 *
 * Example:
 *
 * teacherAcademicAccess("results", "add")
 *
 * Controller must provide:
 *
 * req.teacherAcademicContext = {
 *   branch,
 *   className,
 *   section,
 *   subjectName
 * }
 */
const teacherAcademicAccess = (
  moduleName,
  action
) => {
  return async (req, res, next) => {
    try {
      const teacher = await loadTeacher(req, res);

      if (!teacher) return;

      const permissionAllowed =
        teacher?.permissions?.[moduleName]?.[action] === true;

      if (!permissionAllowed) {
        return res.status(403).json({
          success: false,
          message:
            `You do not have permission to ${action} ${moduleName}.`,
        });
      }

      const {
        branch,
        className,
        section = "",
        subjectName,
      } = req.teacherAcademicContext || {};

      if (!branch || !className) {
        return res.status(400).json({
          success: false,
          message:
            "Branch and class are required for teacher academic access.",
        });
      }

      const allowed = hasAcademicAccess({
        teacher,
        branch,
        className,
        section,
        subjectName,
      });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "Teacher does not have academic access to this class, section or subject.",
        });
      }

      next();
    } catch (error) {
      console.error(
        "teacherAcademicAccess error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Academic access check failed.",
      });
    }
  };
};

/**
 * Attendance permission
 */
const teacherAttendancePermission = (action) => {
  return async (req, res, next) => {
    try {
      const teacher = await loadTeacher(req, res);

      if (!teacher) return;

      const allowed =
        teacher?.permissions?.attendance?.[action] === true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            `You do not have attendance ${action} permission.`,
        });
      }

      next();
    } catch (error) {
      console.error(
        "teacherAttendancePermission error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Attendance permission check failed.",
      });
    }
  };
};

/**
 * Attendance class/section access
 *
 * Controller should provide:
 *
 * req.teacherAttendanceContext = {
 *   branch,
 *   className,
 *   section
 * }
 */
const teacherAttendanceAccess = async (
  req,
  res,
  next
) => {
  try {
    const teacher = await loadTeacher(req, res);

    if (!teacher) return;

    const {
      branch,
      className,
      section = "",
    } = req.teacherAttendanceContext || {};

    if (!branch || !className) {
      return res.status(400).json({
        success: false,
        message:
          "Branch and class are required for attendance access.",
      });
    }

    const allowed = hasAttendanceAccess({
      teacher,
      branch,
      className,
      section,
    });

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "Teacher does not have attendance access to this class or section.",
      });
    }

    next();
  } catch (error) {
    console.error(
      "teacherAttendanceAccess error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Attendance access check failed.",
    });
  }
};

module.exports = {
  teacherPermissionMiddleware,
  teacherAcademicAccess,
  teacherAttendancePermission,
  teacherAttendanceAccess,
};