// controllers/teacherController.js

const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const {
  ALLOWED_BRANCHES,
  normalizePermissions,
  normalizeAcademicAccess,
  normalizeAttendanceAccess,
} = require("../utils/teacherPermissions");

/* =========================================================
   GENERATE TEACHER ID
========================================================= */

const generateTeacherId = async (db) => {
  const teachers = await db
    .collection("teachers")
    .find(
      {
        teacherId: {
          $exists: true,
        },
      },
      {
        projection: {
          teacherId: 1,
        },
      }
    )
    .toArray();

  let maxNumber = 0;

  for (const teacher of teachers) {
    const match = String(
      teacher.teacherId || ""
    ).match(/T-(\d+)/i);

    if (match) {
      const number = parseInt(match[1], 10);

      if (!Number.isNaN(number)) {
        maxNumber = Math.max(
          maxNumber,
          number
        );
      }
    }
  }

  return `T-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
};

/* =========================================================
   GENERATE LOGIN PASSWORD
========================================================= */

const generateTeacherPassword = () => {
  const randomNumber = Math.floor(
    100000 +
      Math.random() * 900000
  );

  return String(randomNumber);
};

/* =========================================================
   SAFE TEACHER
========================================================= */

const getSafeTeacher = (teacher) => {
  if (!teacher) return null;

  const {
    passwordHash,
    ...safeTeacher
  } = teacher;

  return safeTeacher;
};

/* =========================================================
   ADD TEACHER
========================================================= */

const addTeacher = async (req, res) => {
  try {
    const {
      name,
      mobile = "",
      email = "",
      branch = "Main Branch",
      subject = "",
      designation = "",
      qualification = "",
      salary = "",
      joiningDate = "",
      address = "",
      status = "Active",
      note = "",

      /*
       * Optional:
       * Normally AddTeacher.jsx does not send these.
       * They are kept here for future compatibility.
       */
      permissions = {},
      academicAccess = [],
      attendanceAccess = [],
    } = req.body || {};

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Teacher name is required.",
      });
    }

    if (!ALLOWED_BRANCHES.includes(branch)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid branch.",
      });
    }

    const db = getDB();

    /* =====================================================
       MOBILE DUPLICATE CHECK
    ===================================================== */

    const cleanMobile = String(
      mobile || ""
    ).trim();

    if (cleanMobile) {
      const existingMobile =
        await db
          .collection("teachers")
          .findOne({
            mobile: cleanMobile,
          });

      if (existingMobile) {
        return res.status(409).json({
          success: false,
          message:
            "This mobile number is already registered.",
        });
      }
    }

    /* =====================================================
       EMAIL DUPLICATE CHECK
    ===================================================== */

    const cleanEmail = String(
      email || ""
    ).trim();

    if (cleanEmail) {
      const existingEmail =
        await db
          .collection("teachers")
          .findOne({
            email: cleanEmail,
          });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message:
            "This email is already registered.",
        });
      }
    }

    /* =====================================================
       GENERATE TEACHER ID
    ===================================================== */

    const teacherId =
      await generateTeacherId(db);

    /* =====================================================
       GENERATE PASSWORD
    ===================================================== */

    const plainPassword =
      generateTeacherPassword();

    const passwordHash =
      await bcrypt.hash(
        plainPassword,
        10
      );

    /* =====================================================
       NORMALIZE STATUS
    ===================================================== */

    const normalizedStatus =
      String(status).toLowerCase() ===
      "inactive"
        ? "inactive"
        : "active";

    /* =====================================================
       NORMALIZE SALARY
    ===================================================== */

    let normalizedSalary = "";

    if (
      salary !== undefined &&
      salary !== null &&
      String(salary).trim() !== ""
    ) {
      const numericSalary = Number(
        salary
      );

      normalizedSalary =
        Number.isNaN(numericSalary)
          ? ""
          : numericSalary;
    }

    /* =====================================================
       CREATE TEACHER
    ===================================================== */

    const now = new Date();

    const teacher = {
      teacherId,

      name: String(name).trim(),

      mobile: cleanMobile,

      email: cleanEmail,

      branch,

      subject: String(
        subject || ""
      ).trim(),

      designation: String(
        designation || ""
      ).trim(),

      qualification: String(
        qualification || ""
      ).trim(),

      salary: normalizedSalary,

      joiningDate: String(
        joiningDate || ""
      ).trim(),

      address: String(
        address || ""
      ).trim(),

      status:
        normalizedStatus,

      note: String(
        note || ""
      ).trim(),

      /*
       * Image information
       *
       * If your upload middleware/controller
       * adds image later, these fields remain
       * compatible.
       */
      image:
        req.body?.image || "",

      imagePublicId:
        req.body?.imagePublicId || "",

      /* ===================================================
         NEW TEACHER ACCESS SYSTEM
      =================================================== */

      permissions:
        normalizePermissions(
          permissions
        ),

      academicAccess:
        normalizeAcademicAccess(
          academicAccess
        ),

      attendanceAccess:
        normalizeAttendanceAccess(
          attendanceAccess
        ),

      passwordHash,

      createdAt: now,

      updatedAt: now,
    };

    /* =====================================================
       INSERT
    ===================================================== */

    const result =
      await db
        .collection("teachers")
        .insertOne(
          teacher
        );

    if (!result.insertedId) {
      return res.status(500).json({
        success: false,
        message:
          "Teacher could not be created.",
      });
    }

    /* =====================================================
       GET CREATED TEACHER
    ===================================================== */

    const createdTeacher =
      await db
        .collection("teachers")
        .findOne({
          _id: result.insertedId,
        });

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,

      message:
        "Teacher created successfully.",

      teacher:
        getSafeTeacher(
          createdTeacher
        ),

      /*
       * Login credentials are returned
       * ONLY at creation time.
       */
      login: {
        teacherId:
          teacher.teacherId,

        password:
          plainPassword,
      },
    });
  } catch (error) {
    console.error(
      "❌ addTeacher error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to create teacher.",
    });
  }
};

/* =========================================================
   GET ALL TEACHERS
========================================================= */

const getTeachers = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const teachers =
      await db
        .collection("teachers")
        .find({})
        .sort({
          createdAt: -1,
        })
        .toArray();

    const safeTeachers =
      teachers.map(
        getSafeTeacher
      );

    return res.status(200).json({
      success: true,
      teachers: safeTeachers,
    });
  } catch (error) {
    console.error(
      "❌ getTeachers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load teachers.",
    });
  }
};

/* =========================================================
   GET SINGLE TEACHER
========================================================= */

const getTeacherById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher ID.",
      });
    }

    const db = getDB();

    const teacher =
      await db
        .collection("teachers")
        .findOne({
          _id: new ObjectId(id),
        });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found.",
      });
    }

    return res.status(200).json({
      success: true,
      teacher:
        getSafeTeacher(
          teacher
        ),
    });
  } catch (error) {
    console.error(
      "❌ getTeacherById error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load teacher.",
    });
  }
};

/* =========================================================
   UPDATE TEACHER
========================================================= */

const updateTeacher = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher ID.",
      });
    }

    const {
      name,
      mobile,
      email,
      branch,
      subject,
      designation,
      qualification,
      salary,
      joiningDate,
      address,
      status,
      note,

      permissions,
      academicAccess,
      attendanceAccess,

      image,
      imagePublicId,
    } = req.body || {};

    const db = getDB();

    const teacher =
      await db
        .collection("teachers")
        .findOne({
          _id: new ObjectId(id),
        });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found.",
      });
    }

    const updateData = {
      updatedAt:
        new Date(),
    };

    /* =====================================================
       BASIC INFORMATION
    ===================================================== */

    if (name !== undefined) {
      const cleanName =
        String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message:
            "Teacher name cannot be empty.",
        });
      }

      updateData.name =
        cleanName;
    }

    /* =====================================================
       MOBILE
    ===================================================== */

    if (mobile !== undefined) {
      const cleanMobile =
        String(mobile).trim();

      if (
        cleanMobile &&
        cleanMobile !==
          teacher.mobile
      ) {
        const duplicate =
          await db
            .collection("teachers")
            .findOne({
              mobile:
                cleanMobile,
              _id: {
                $ne:
                  new ObjectId(id),
              },
            });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "This mobile number is already registered.",
          });
        }
      }

      updateData.mobile =
        cleanMobile;
    }

    /* =====================================================
       EMAIL
    ===================================================== */

    if (email !== undefined) {
      const cleanEmail =
        String(email).trim();

      if (
        cleanEmail &&
        cleanEmail !==
          teacher.email
      ) {
        const duplicate =
          await db
            .collection("teachers")
            .findOne({
              email:
                cleanEmail,
              _id: {
                $ne:
                  new ObjectId(id),
              },
            });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "This email is already registered.",
          });
        }
      }

      updateData.email =
        cleanEmail;
    }

    /* =====================================================
       BRANCH
    ===================================================== */

    if (branch !== undefined) {
      if (
        !ALLOWED_BRANCHES.includes(
          branch
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid branch.",
        });
      }

      updateData.branch =
        branch;
    }

    /* =====================================================
       OTHER FIELDS
    ===================================================== */

    if (subject !== undefined) {
      updateData.subject =
        String(
          subject || ""
        ).trim();
    }

    if (
      designation !==
      undefined
    ) {
      updateData.designation =
        String(
          designation || ""
        ).trim();
    }

    if (
      qualification !==
      undefined
    ) {
      updateData.qualification =
        String(
          qualification || ""
        ).trim();
    }

    if (
      salary !== undefined
    ) {
      if (
        String(
          salary
        ).trim() === ""
      ) {
        updateData.salary =
          "";
      } else {
        const numericSalary =
          Number(salary);

        updateData.salary =
          Number.isNaN(
            numericSalary
          )
            ? ""
            : numericSalary;
      }
    }

    if (
      joiningDate !==
      undefined
    ) {
      updateData.joiningDate =
        String(
          joiningDate || ""
        ).trim();
    }

    if (
      address !== undefined
    ) {
      updateData.address =
        String(
          address || ""
        ).trim();
    }

    if (
      note !== undefined
    ) {
      updateData.note =
        String(
          note || ""
        ).trim();
    }

    /* =====================================================
       STATUS
    ===================================================== */

    if (status !== undefined) {
      updateData.status =
        String(status)
          .toLowerCase() ===
        "inactive"
          ? "inactive"
          : "active";
    }

    /* =====================================================
       IMAGE
    ===================================================== */

    if (image !== undefined) {
      updateData.image =
        image;
    }

    if (
      imagePublicId !==
      undefined
    ) {
      updateData.imagePublicId =
        imagePublicId;
    }

    /* =====================================================
       ACCESS SYSTEM
    ===================================================== */

    if (
      permissions !==
      undefined
    ) {
      updateData.permissions =
        normalizePermissions(
          permissions
        );
    }

    if (
      academicAccess !==
      undefined
    ) {
      updateData.academicAccess =
        normalizeAcademicAccess(
          academicAccess
        );
    }

    if (
      attendanceAccess !==
      undefined
    ) {
      updateData.attendanceAccess =
        normalizeAttendanceAccess(
          attendanceAccess
        );
    }

    /* =====================================================
       UPDATE
    ===================================================== */

    const result =
      await db
        .collection("teachers")
        .updateOne(
          {
            _id:
              new ObjectId(id),
          },
          {
            $set:
              updateData,
          }
        );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found.",
      });
    }

    const updatedTeacher =
      await db
        .collection("teachers")
        .findOne({
          _id:
            new ObjectId(id),
        });

    return res.status(200).json({
      success: true,
      message:
        "Teacher updated successfully.",

      teacher:
        getSafeTeacher(
          updatedTeacher
        ),
    });
  } catch (error) {
    console.error(
      "❌ updateTeacher error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to update teacher.",
    });
  }
};

/* =========================================================
   DELETE TEACHER
========================================================= */

const deleteTeacher = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher ID.",
      });
    }

    const db = getDB();

    const result =
      await db
        .collection("teachers")
        .deleteOne({
          _id:
            new ObjectId(id),
        });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Teacher deleted successfully.",
    });
  } catch (error) {
    console.error(
      "❌ deleteTeacher error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete teacher.",
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
    const { id } =
      req.params;

    const {
      password,
    } = req.body || {};

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher ID.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "New password is required.",
      });
    }

    if (
      String(password).length <
      4
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 4 characters.",
      });
    }

    const db = getDB();

    const passwordHash =
      await bcrypt.hash(
        String(password),
        10
      );

    const result =
      await db
        .collection("teachers")
        .updateOne(
          {
            _id:
              new ObjectId(id),
          },
          {
            $set: {
              passwordHash,
              updatedAt:
                new Date(),
            },
          }
        );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Teacher password reset successfully.",
    });
  } catch (error) {
    console.error(
      "❌ resetTeacherPassword error:",
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
   EXPORTS
========================================================= */

module.exports = {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
};