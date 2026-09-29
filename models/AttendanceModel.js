const AttendanceModel = {
  studentId: null,

  studentIdCard: "",
  studentName: "",

  branch: "Main Branch",

  className: "",
  section: "",

  date: "",

  entryTime: null,
  exitTime: null,

  status: "Present",

  leaveReason: "",

  createdAt: new Date(),
  updatedAt: new Date(),
};

module.exports = AttendanceModel;