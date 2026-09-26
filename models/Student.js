const StudentModel = {
  /* =========================================================
     BASIC INFORMATION
  ========================================================= */

  name: "",

  // This is the Student ID provided by admin
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
     STUDENT LOGIN
  ========================================================= */

  // Never store the real password here.
  // The actual password will be converted to a bcrypt hash.
  passwordHash: null,

  /* =========================================================
     STUDENT QR CODE
  ========================================================= */

  qrCode: null,

  /* =========================================================
     SYSTEM INFORMATION
  ========================================================= */

  createdAt: new Date(),

  updatedAt: new Date(),
};

module.exports = StudentModel;