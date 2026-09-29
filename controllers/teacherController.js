const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Readable } = require("stream");

const { getDB } = require("../config/db");
const cloudinary = require("../config/cloudinary");

/* =========================================================
   CLOUDINARY UPLOAD
========================================================= */

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "madrasa/teachers",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    Readable.from(fileBuffer).pipe(stream);
  });
};

/* =========================================================
   GENERATE TEACHER ID
========================================================= */

const generateTeacherId = async (teachersCollection) => {
  const lastTeacher = await teachersCollection
    .find({})
    .sort({ teacherId: -1 })
    .limit(1)
    .toArray();

  if (!lastTeacher.length) {
    return "T-0001";
  }

  const lastId = lastTeacher[0].teacherId || "T-0000";

  const number = parseInt(
    lastId.replace("T-", ""),
    10
  );

  const nextNumber = Number.isNaN(number)
    ? 1
    : number + 1;

  return `T-${String(nextNumber).padStart(4, "0")}`;
};

/* =========================================================
   GENERATE LOGIN PASSWORD
========================================================= */

const generateTeacherPassword = () => {
  return `TR${crypto.randomInt(100000, 1000000)}`;
};

/* =========================================================
   DEFAULT PERMISSIONS
========================================================= */

const getDefaultPermissions = () => ({
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

/* =========================================================
   NORMALIZE PERMISSIONS
========================================================= */

const normalizePermissions = (permissions) => {
  const defaults = getDefaultPermissions();

  if (!permissions || typeof permissions !== "object") {
    return defaults;
  }

  Object.keys(defaults).forEach((module) => {
    if (
      permissions[module] &&
      typeof permissions[module] === "object"
    ) {
      Object.keys(defaults[module]).forEach((action) => {
        defaults[module][action] =
          permissions[module][action] === true;
      });
    }
  });

  return defaults;
};

/* =========================================================
   NORMALIZE ASSIGNMENTS
========================================================= */

const normalizeAssignments = (assignments) => {
  if (!Array.isArray(assignments)) {
    return [];
  }

  return assignments
    .map((assignment) => ({
      className: String(
        assignment?.className || ""
      ).trim(),

      subjectName: String(
        assignment?.subjectName || ""
      ).trim(),
    }))
    .filter(
      (assignment) =>
        assignment.className &&
        assignment.subjectName
    );
};

/* =========================================================
   ADD TEACHER
========================================================= */

const addTeacher = async (req, res) => {
  try {
    const {
      name,
      subject,
      designation,
      qualification,
      salary,
      mobile,
      joiningDate,
      address,
      status,
      note,
      permissions,
      assignments,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Teacher name is required.",
      });
    }

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!designation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Designation is required.",
      });
    }

    const db = getDB();
    const teachersCollection =
      db.collection("teachers");

    const teacherId =
      await generateTeacherId(
        teachersCollection
      );

    /* ===============================
       IMAGE
    =============================== */

    let image = null;
    let imagePublicId = null;

    if (req.file) {
      const uploaded =
        await uploadToCloudinary(
          req.file.buffer
        );

      image = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    /* ===============================
       PASSWORD
    =============================== */

    const generatedPassword =
      generateTeacherPassword();

    const passwordHash =
      await bcrypt.hash(
        generatedPassword,
        10
      );

    /* ===============================
       DATA
    =============================== */

    const now = new Date();

    const teacher = {
      teacherId,

      name: name.trim(),
      subject: subject.trim(),
      designation: designation.trim(),
      qualification:
        qualification?.trim() || "",

      salary: Number(salary || 0),
      mobile: mobile?.trim() || "",

      joiningDate:
        joiningDate || "",

      address:
        address?.trim() || "",

      status:
        status || "Active",

      note:
        note?.trim() || "",

      image,
      imagePublicId,

      passwordHash,

      permissions:
        normalizePermissions(
          permissions
        ),

      assignments:
        normalizeAssignments(
          assignments
        ),

      createdAt: now,
      updatedAt: now,
    };

    const result =
      await teachersCollection.insertOne(
        teacher
      );

    const savedTeacher = {
      ...teacher,
      _id: result.insertedId,
    };

    /* Do not send passwordHash */

    const {
      passwordHash: hiddenPasswordHash,
      ...teacherWithoutHash
    } = savedTeacher;

    return res.status(201).json({
      success: true,
      message: "Teacher added successfully.",

      teacher: teacherWithoutHash,

      login: {
        teacherId,
        password: generatedPassword,
      },
    });
  } catch (error) {
    console.error(
      "Add Teacher Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add teacher.",
    });
  }
};

/* =========================================================
   GET ALL TEACHERS
========================================================= */

const getTeachers = async (req, res) => {
  try {
    const db = getDB();

    const teachers =
      await db
        .collection("teachers")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

    const safeTeachers =
      teachers.map((teacher) => {
        const {
          passwordHash,
          ...safeTeacher
        } = teacher;

        return safeTeacher;
      });

    return res.status(200).json({
      success: true,
      count: safeTeachers.length,
      teachers: safeTeachers,
    });
  } catch (error) {
    console.error(
      "Get Teachers Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load teachers.",
    });
  }
};

/* =========================================================
   GET TEACHER BY ID
========================================================= */

const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    const db = getDB();

    const teacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(id),
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const {
      passwordHash,
      ...safeTeacher
    } = teacher;

    return res.status(200).json({
      success: true,
      teacher: safeTeacher,
    });
  } catch (error) {
    console.error(
      "Get Teacher Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load teacher.",
    });
  }
};

/* =========================================================
   UPDATE TEACHER
========================================================= */

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    const db = getDB();

    const teachersCollection =
      db.collection("teachers");

    const existingTeacher =
      await teachersCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const {
      name,
      subject,
      designation,
      qualification,
      salary,
      mobile,
      joiningDate,
      address,
      status,
      note,
      permissions,
      assignments,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Teacher name is required.",
      });
    }

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!designation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Designation is required.",
      });
    }

    /* ===============================
       IMAGE
    =============================== */

    let image =
      existingTeacher.image || null;

    let imagePublicId =
      existingTeacher.imagePublicId || null;

    if (req.file) {
      const uploaded =
        await uploadToCloudinary(
          req.file.buffer
        );

      image = uploaded.secure_url;
      imagePublicId =
        uploaded.public_id;

      if (
        existingTeacher.imagePublicId
      ) {
        try {
          await cloudinary.uploader.destroy(
            existingTeacher.imagePublicId
          );
        } catch (cloudinaryError) {
          console.error(
            "Old teacher image delete error:",
            cloudinaryError
          );
        }
      }
    }

    /* ===============================
       UPDATE DATA
    =============================== */

    const updateData = {
      name: name.trim(),
      subject: subject.trim(),
      designation: designation.trim(),

      qualification:
        qualification?.trim() || "",

      salary: Number(salary || 0),

      mobile:
        mobile?.trim() || "",

      joiningDate:
        joiningDate || "",

      address:
        address?.trim() || "",

      status:
        status || "Active",

      note:
        note?.trim() || "",

      image,
      imagePublicId,

      permissions:
        permissions !== undefined
          ? normalizePermissions(
              permissions
            )
          : normalizePermissions(
              existingTeacher.permissions
            ),

      assignments:
        assignments !== undefined
          ? normalizeAssignments(
              assignments
            )
          : normalizeAssignments(
              existingTeacher.assignments
            ),

      updatedAt: new Date(),
    };

    await teachersCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      }
    );

    const updatedTeacher =
      await teachersCollection.findOne({
        _id: new ObjectId(id),
      });

    const {
      passwordHash,
      ...safeTeacher
    } = updatedTeacher;

    return res.status(200).json({
      success: true,
      message:
        "Teacher updated successfully.",
      teacher: safeTeacher,
    });
  } catch (error) {
    console.error(
      "Update Teacher Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update teacher.",
    });
  }
};

/* =========================================================
   DELETE TEACHER
========================================================= */

const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    const db = getDB();

    const teachersCollection =
      db.collection("teachers");

    const teacher =
      await teachersCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    await teachersCollection.deleteOne({
      _id: new ObjectId(id),
    });

    /* Delete Cloudinary image */

    if (teacher.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          teacher.imagePublicId
        );
      } catch (cloudinaryError) {
        console.error(
          "Teacher image delete error:",
          cloudinaryError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Teacher deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete Teacher Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete teacher.",
    });
  }
};

/* =========================================================
   RESET TEACHER PASSWORD
========================================================= */

const resetTeacherPassword = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    const db = getDB();

    const teachersCollection =
      db.collection("teachers");

    const teacher =
      await teachersCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const generatedPassword =
      generateTeacherPassword();

    const passwordHash =
      await bcrypt.hash(
        generatedPassword,
        10
      );

    await teachersCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Teacher password reset successfully.",

      login: {
        teacherId: teacher.teacherId,
        password: generatedPassword,
      },
    });
  } catch (error) {
    console.error(
      "Reset Teacher Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reset teacher password.",
    });
  }
};

/* =========================================================
   UPDATE PERMISSIONS
========================================================= */

const updateTeacherPermissions = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    if (
      !permissions ||
      typeof permissions !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid permissions are required.",
      });
    }

    const db = getDB();

    const result =
      await db.collection("teachers").updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            permissions:
              normalizePermissions(
                permissions
              ),
            updatedAt: new Date(),
          },
        }
      );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const teacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(id),
      });

    const {
      passwordHash,
      ...safeTeacher
    } = teacher;

    return res.status(200).json({
      success: true,
      message:
        "Teacher permissions updated successfully.",
      teacher: safeTeacher,
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
   UPDATE TEACHER ASSIGNMENTS
========================================================= */

const updateTeacherAssignments = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { assignments } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    if (!Array.isArray(assignments)) {
      return res.status(400).json({
        success: false,
        message:
          "Assignments must be an array.",
      });
    }

    const normalizedAssignments =
      normalizeAssignments(
        assignments
      );

    const db = getDB();

    const result =
      await db.collection("teachers").updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            assignments:
              normalizedAssignments,
            updatedAt: new Date(),
          },
        }
      );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const teacher =
      await db.collection("teachers").findOne({
        _id: new ObjectId(id),
      });

    const {
      passwordHash,
      ...safeTeacher
    } = teacher;

    return res.status(200).json({
      success: true,
      message:
        "Teacher assignments updated successfully.",
      teacher: safeTeacher,
    });
  } catch (error) {
    console.error(
      "Update Teacher Assignments Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update teacher assignments.",
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,

  resetTeacherPassword,
  updateTeacherPermissions,
  updateTeacherAssignments,
};