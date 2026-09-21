const ResultModel = {
  studentId: null,

  studentName: "",
  studentIdCard: "",
  className: "",

  examName: "",

  subjects: [
    {
      subjectId: null,
      subjectName: "",
      fullMarks: 100,
      obtainedMarks: 0,
      percentage: 0,
      grade: "",
    },
  ],

  totalMarks: 0,
  totalFullMarks: 0,
  percentage: 0,
  grade: "",
  status: "",

  createdAt: new Date(),
  updatedAt: new Date(),
};

module.exports = ResultModel;