// utils/teacherPermissions.js

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

const PERMISSION_MODULES = {
  students: ["view", "add", "edit", "delete"],
  results: ["view", "add", "edit", "delete"],
  homework: ["view", "add", "edit", "delete"],
  notices: ["view", "add", "edit", "delete"],
  fees: ["view", "add", "edit", "delete"],
  attendance: ["view", "scan", "edit", "delete"],
};

const createDefaultPermissions = () => ({
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
});

/**
 * Normalize permissions.
 * Unknown fields are removed.
 */
const normalizePermissions = (permissions = {}) => {
  const defaults = createDefaultPermissions();

  Object.keys(defaults).forEach((moduleName) => {
    const allowedActions = PERMISSION_MODULES[moduleName];

    allowedActions.forEach((action) => {
      defaults[moduleName][action] =
        permissions?.[moduleName]?.[action] === true;
    });
  });

  return defaults;
};

/**
 * Academic access
 *
 * branch + class + optional section + subjects
 *
 * section === "" means entire class.
 */
const normalizeAcademicAccess = (access = []) => {
  if (!Array.isArray(access)) {
    return [];
  }

  const result = [];

  access.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const branch = String(item.branch || "").trim();
    const className = String(item.className || "").trim();
    const section = String(item.section || "").trim();

    if (!ALLOWED_BRANCHES.includes(branch)) return;
    if (!ALLOWED_CLASSES.includes(className)) return;

    const subjects = Array.isArray(item.subjects)
      ? [...new Set(
          item.subjects
            .map((subject) => String(subject).trim())
            .filter((subject) => ALLOWED_SUBJECTS.includes(subject))
        )]
      : [];

    if (!subjects.length) return;

    const exists = result.some(
      (existing) =>
        existing.branch === branch &&
        existing.className === className &&
        existing.section === section
    );

    if (exists) {
      const existing = result.find(
        (existing) =>
          existing.branch === branch &&
          existing.className === className &&
          existing.section === section
      );

      existing.subjects = [
        ...new Set([...existing.subjects, ...subjects]),
      ];

      return;
    }

    result.push({
      branch,
      className,
      section,
      subjects,
    });
  });

  return result;
};

/**
 * Attendance access
 *
 * branch + class + optional section
 *
 * No subject.
 */
const normalizeAttendanceAccess = (access = []) => {
  if (!Array.isArray(access)) {
    return [];
  }

  const result = [];

  access.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const branch = String(item.branch || "").trim();
    const className = String(item.className || "").trim();
    const section = String(item.section || "").trim();

    if (!ALLOWED_BRANCHES.includes(branch)) return;
    if (!ALLOWED_CLASSES.includes(className)) return;

    const exists = result.some(
      (existing) =>
        existing.branch === branch &&
        existing.className === className &&
        existing.section === section
    );

    if (exists) return;

    result.push({
      branch,
      className,
      section,
    });
  });

  return result;
};

/**
 * Check academic access.
 *
 * section blank in assignment = all sections.
 */
const hasAcademicAccess = ({
  teacher,
  branch,
  className,
  section = "",
  subjectName,
}) => {
  if (!teacher) return false;

  const teacherAccess = Array.isArray(teacher.academicAccess)
    ? teacher.academicAccess
    : [];

  const requestedBranch = String(branch || "").trim();
  const requestedClass = String(className || "").trim();
  const requestedSection = String(section || "").trim();
  const requestedSubject = String(subjectName || "").trim();

  return teacherAccess.some((access) => {
    const branchMatch = access.branch === requestedBranch;
    const classMatch = access.className === requestedClass;

    const sectionMatch =
      !access.section ||
      access.section === requestedSection;

    const subjectMatch =
      Array.isArray(access.subjects) &&
      access.subjects.includes(requestedSubject);

    return (
      branchMatch &&
      classMatch &&
      sectionMatch &&
      subjectMatch
    );
  });
};

/**
 * Check attendance access.
 *
 * section blank in assignment = all sections.
 */
const hasAttendanceAccess = ({
  teacher,
  branch,
  className,
  section = "",
}) => {
  if (!teacher) return false;

  const teacherAccess = Array.isArray(teacher.attendanceAccess)
    ? teacher.attendanceAccess
    : [];

  const requestedBranch = String(branch || "").trim();
  const requestedClass = String(className || "").trim();
  const requestedSection = String(section || "").trim();

  return teacherAccess.some((access) => {
    const branchMatch = access.branch === requestedBranch;
    const classMatch = access.className === requestedClass;

    const sectionMatch =
      !access.section ||
      access.section === requestedSection;

    return (
      branchMatch &&
      classMatch &&
      sectionMatch
    );
  });
};

const getTeacherAcademicClasses = (teacher) => {
  if (!Array.isArray(teacher?.academicAccess)) {
    return [];
  }

  return teacher.academicAccess;
};

const getTeacherAttendanceClasses = (teacher) => {
  if (!Array.isArray(teacher?.attendanceAccess)) {
    return [];
  }

  return teacher.attendanceAccess;
};

module.exports = {
  ALLOWED_BRANCHES,
  ALLOWED_CLASSES,
  ALLOWED_SUBJECTS,

  PERMISSION_MODULES,

  createDefaultPermissions,
  normalizePermissions,
  normalizeAcademicAccess,
  normalizeAttendanceAccess,

  hasAcademicAccess,
  hasAttendanceAccess,

  getTeacherAcademicClasses,
  getTeacherAttendanceClasses,
};