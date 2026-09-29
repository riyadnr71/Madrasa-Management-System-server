const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

/* =========================================================
   CHECK PERMISSION
========================================================= */

const teacherPermissionMiddleware = (
  moduleName,
  action
) => {
  return async (req, res, next) => {
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
            "Teacher account not found.",
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
            "Teacher account is inactive.",
        });
      }

      const allowed =
        teacher?.permissions?.[
          moduleName
        ]?.[action] === true;

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action.",
        });
      }

      req.teacherData = teacher;

      next();
    } catch (error) {
      console.error(
        "Teacher Permission Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to verify teacher permission.",
      });
    }
  };
};

/* =========================================================
   CHECK CLASS + SUBJECT ASSIGNMENT
========================================================= */

const checkTeacherAssignment = async (
  teacher,
  className,
  subjectName
) => {
  if (
    !teacher ||
    !Array.isArray(
      teacher.assignments
    )
  ) {
    return false;
  }

  return teacher.assignments.some(
    (assignment) =>
      String(
        assignment.className
      ).trim() ===
        String(className).trim() &&
      String(
        assignment.subjectName
      ).trim() ===
        String(subjectName).trim()
  );
};

module.exports = {
  teacherPermissionMiddleware,
  checkTeacherAssignment,
};