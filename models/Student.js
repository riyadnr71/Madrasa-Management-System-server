const StudentModel = {
  /* =========================================================
     BASIC INFORMATION
  ========================================================= */

  name: "",

  idCard: "",

  roll: "",

  className: "",

  section: "",

  session: "",

  dateOfBirth: "",

  gender: "",

  bloodGroup: "",

  religion: "",

  nationality: "Bangladeshi",

  /* =========================================================
     PARENT / GUARDIAN INFORMATION
  ========================================================= */

  fatherName: "",

  fatherMobile: "",

  motherName: "",

  motherMobile: "",

  guardianName: "",

  guardianMobile: "",

  guardianRelation: "",

  /* =========================================================
     ADDRESS
  ========================================================= */

  presentAddress: "",

  permanentAddress: "",

  /* =========================================================
     ACADEMIC INFORMATION
  ========================================================= */

  admissionDate: "",

  previousInstitution: "",

  previousClass: "",

  status: "Active",

  /* =========================================================
     STUDENT PHOTO
  ========================================================= */

  image: null,

  imagePublicId: null,

  /* =========================================================
     SYSTEM INFORMATION
  ========================================================= */

  createdAt: new Date(),

  updatedAt: new Date(),
};

module.exports = StudentModel;