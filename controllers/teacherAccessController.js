const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_BRANCHES = [
  "Main Branch",
  "2nd Branch",
];

const ALLOWED_CLASSES = [
  "Play",
  "KG",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

const ALLOWED_SUBJECTS = [
  "Bangla",
  "English",
  "Arabic",
  "Quran",
  "Hadith",
  "Fiqh",
  "Aqeedah",
  "Islamic Studies",
  "Mathematics",
  "Science",
  "ICT",
  "Social Science",
  "Other",
];

/* =========================================================
   DEFAULT PERMISSIONS
========================================================= */

const DEFAULT_PERMISSIONS = {
  students: {
    view: false,
    add: false,
    edit: false,
    delete: false,
  },

  results: {
    view: false,
    add: false,
    edit: false,
    delete: false,
  },

  homework: {
    view: false,
    add: false,
    edit: false,
    delete: false,
  },

  notices: {
    view: false,
    add: false,
    edit: false,
    delete: false,
  },

  fees: {
    view: false,
    add: false,
    edit: false,
    delete: false,
  },

  attendance: {
    view: false,
    scan: false,
    edit: false,
    delete: false,
  },
};

/* =========================================================
   NORMALIZE PERMISSIONS
========================================================= */

const normalizePermissions = (permissions = {}) => {
  const result = {};

  Object.keys(DEFAULT_PERMISSIONS).forEach((moduleName) => {
    result[moduleName] = {};

    Object.keys(DEFAULT_PERMISSIONS[moduleName]).forEach(
      (action) => {
        result[moduleName][action] =
          permissions?.[moduleName]?.[action] === true;
      }
    );
  });

  return result;
};

/* =========================================================
   VALIDATE ACADEMIC ACCESS
========================================================= */

const normalizeAcademicAccess = (access = []) => {
  if (!Array.isArray(access)) return [];

  const result = [];

  for (const item of access) {
    if (!item) continue;

    const branch = String(item.branch || "").trim();
    const className = String(item.className || "").trim();
    const section = String(item.section || "").trim();

    if (!ALLOWED_BRANCHES.includes(branch)) {
      continue;
    }

    if (!ALLOWED_CLASSES.includes(className)) {
      continue;
    }

    const subjects = Array.isArray(item.subjects)
      ? item.subjects.filter((subject) =>
          ALLOWED_SUBJECTS.includes(subject)
        )
      : [];

    if (!subjects.length) {
      continue;
    }

    result.push({
      branch,
      className,
      section,
      subjects: [...new Set(subjects)],
    });
  }

  return result;
};

/* =========================================================
   VALIDATE ATTENDANCE ACCESS
========================================================= */

const normalizeAttendanceAccess = (access = []) => {
  if (!Array.isArray(access)) return [];

  const result = [];

  for (const item of access) {
    if (!item) continue;

    const branch = String(item.branch || "").trim();
    const className = String(item.className || "").trim();
    const section = String(item.section || "").trim();

    if (!ALLOWED_BRANCHES.includes(branch)) {
      continue;
    }

    if (!ALLOWED_CLASSES.includes(className)) {
      continue;
    }

    result.push({
      branch,
      className,
      section,
    });
  }

  return result;
};

/* =========================================================
   FIND TEACHER
========================================================= */

const findTeacher = async (teacherId) => {
  if (!ObjectId.isValid(teacherId)) {
    return null;
  }

  const db = getDB();

  return db.collection("teachers").findOne({
    _id: new ObjectId(teacherId),
  });
};

/* =========================================================
   GET TEACHER ACCESS
========================================================= */

const getTeacherAccess = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await findTeacher(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    return res.status(200).json({
      success: true,

      teacher,

      permissions: normalizePermissions(
        teacher.permissions
      ),

      academicAccess:
        Array.isArray(teacher.academicAccess)
          ? teacher.academicAccess
          : [],

      attendanceAccess:
        Array.isArray(teacher.attendanceAccess)
          ? teacher.attendanceAccess
          : [],
    });
  } catch (error) {
    console.error(
      "Get Teacher Access Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load teacher access.",
    });
  }
};

/* =========================================================
   UPDATE TEACHER PERMISSIONS
========================================================= */

const updateTeacherPermissions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await findTeacher(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const permissions = normalizePermissions(
      req.body?.permissions
    );

    const db = getDB();

    await db.collection("teachers").updateOne(
      {
        _id: new ObjectId(teacherId),
      },
      {
        $set: {
          permissions,
          updatedAt: new Date(),
        },
      }
    );

    const updatedTeacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(teacherId),
      });

    return res.status(200).json({
      success: true,
      message: "Teacher permissions updated successfully.",

      teacher: updatedTeacher,

      permissions:
        updatedTeacher.permissions,
    });
  } catch (error) {
    console.error(
      "Update Teacher Permissions Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update teacher permissions.",
    });
  }
};

/* =========================================================
   UPDATE ACADEMIC ACCESS
========================================================= */

const updateAcademicAccess = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await findTeacher(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const academicAccess =
      normalizeAcademicAccess(
        req.body?.academicAccess
      );

    const db = getDB();

    await db.collection("teachers").updateOne(
      {
        _id: new ObjectId(teacherId),
      },
      {
        $set: {
          academicAccess,
          updatedAt: new Date(),
        },
      }
    );

    const updatedTeacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(teacherId),
      });

    return res.status(200).json({
      success: true,
      message:
        "Academic access updated successfully.",

      teacher: updatedTeacher,

      academicAccess:
        updatedTeacher.academicAccess || [],
    });
  } catch (error) {
    console.error(
      "Update Academic Access Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update academic access.",
    });
  }
};

/* =========================================================
   UPDATE ATTENDANCE ACCESS
========================================================= */

const updateAttendanceAccess = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await findTeacher(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const attendanceAccess =
      normalizeAttendanceAccess(
        req.body?.attendanceAccess
      );

    const db = getDB();

    await db.collection("teachers").updateOne(
      {
        _id: new ObjectId(teacherId),
      },
      {
        $set: {
          attendanceAccess,
          updatedAt: new Date(),
        },
      }
    );

    const updatedTeacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(teacherId),
      });

    return res.status(200).json({
      success: true,
      message:
        "Attendance access updated successfully.",

      teacher: updatedTeacher,

      attendanceAccess:
        updatedTeacher.attendanceAccess || [],
    });
  } catch (error) {
    console.error(
      "Update Attendance Access Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update attendance access.",
    });
  }
};

module.exports = {
  getTeacherAccess,
  updateTeacherPermissions,
  updateAcademicAccess,
  updateAttendanceAccess,
};