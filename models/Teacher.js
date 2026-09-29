// models/TeacherModel.js

const {
  createDefaultPermissions,
} = require("../utils/teacherPermissions");

const TeacherModel = {
  teacherId: "",
  name: "",
  mobile: "",
  email: "",

  branch: "Main Branch",

  passwordHash: "",

  status: "active",

  permissions: createDefaultPermissions(),

  academicAccess: [],

  attendanceAccess: [],

  createdAt: new Date(),
  updatedAt: new Date(),
};

module.exports = TeacherModel;