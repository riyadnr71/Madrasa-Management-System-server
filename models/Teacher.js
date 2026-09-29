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
});

const TeacherModel = {
  teacherId: "",

  name: "",
  subject: "",
  designation: "",
  qualification: "",

  salary: 0,
  mobile: "",

  joiningDate: "",
  address: "",

  status: "Active",
  note: "",

  image: null,
  imagePublicId: null,

  // Teacher Login
  passwordHash: null,

  // Admin controlled permissions
  permissions: createDefaultPermissions(),

  // Class + Subject assignments
  assignments: [],

  createdAt: new Date(),
  updatedAt: new Date(),
};

module.exports = TeacherModel;