const { ObjectId } = require("mongodb");
const { Readable } = require("stream");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");

const { getDB } = require("../config/db");
const cloudinary = require("../config/cloudinary");

/* =========================================================
   CONFIG
========================================================= */

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

/* =========================================================
   CLOUDINARY UPLOAD
========================================================= */

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "madrasa/students",
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

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

/* =========================================================
   GENERATE STUDENT PASSWORD
========================================================= */

const generateStudentPassword = () => {
  const randomNumber = Math.floor(
    100000 + Math.random() * 900000
  );

  return `NR${randomNumber}`;
};

/* =========================================================
   GENERATE STUDENT QR
========================================================= */

const generateStudentQR = async (studentId) => {
  const baseUrl =
    FRONTEND_URL.replace(/\/$/, "");

  const studentPortalUrl =
    `${baseUrl}/student/${studentId}`;

  return await QRCode.toDataURL(
    studentPortalUrl,
    {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 500,
    }
  );
};

/* =========================================================
   ADD STUDENT
========================================================= */

const addStudent = async (req, res) => {
  try {
    const db = getDB();

    const {
      name,
      idCard,
      roll,
      className,
      section,
      session,
      dateOfBirth,
      gender,
      bloodGroup,
      religion,
      nationality,
      fatherName,
      fatherMobile,
      motherName,
      motherMobile,
      guardianName,
      guardianMobile,
      guardianRelation,
      presentAddress,
      permanentAddress,
      admissionDate,
      previousInstitution,
      previousClass,
      status,
    } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Student name is required",
      });
    }

    if (!idCard?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    if (!className?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    /* =====================================================
       DUPLICATE STUDENT ID
    ===================================================== */

    const existingStudent =
      await db.collection("students").findOne({
        idCard: idCard.trim(),
      });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message:
          "A student with this Student ID already exists",
      });
    }

    /* =====================================================
       IMAGE
    ===================================================== */

    let image = null;
    let imagePublicId = null;

    if (req.file?.buffer) {
      const uploadedImage =
        await uploadToCloudinary(
          req.file.buffer
        );

      image =
        uploadedImage.secure_url ||
        uploadedImage.url ||
        null;

      imagePublicId =
        uploadedImage.public_id ||
        null;
    }

    /* =====================================================
       PASSWORD
    ===================================================== */

    const generatedPassword =
      generateStudentPassword();

    const passwordHash =
      await bcrypt.hash(
        generatedPassword,
        10
      );

    /* =====================================================
       STUDENT DATA
    ===================================================== */

    const now = new Date();

    const student = {
      name: name.trim(),
      idCard: idCard.trim(),
      roll: roll || "",
      className: className.trim(),
      section: section || "",
      session: session || "",

      dateOfBirth: dateOfBirth || "",
      gender: gender || "",
      bloodGroup: bloodGroup || "",
      religion: religion || "",
      nationality:
        nationality || "Bangladeshi",

      fatherName: fatherName || "",
      fatherMobile: fatherMobile || "",

      motherName: motherName || "",
      motherMobile: motherMobile || "",

      guardianName: guardianName || "",
      guardianMobile:
        guardianMobile || "",
      guardianRelation:
        guardianRelation || "",

      presentAddress:
        presentAddress || "",

      permanentAddress:
        permanentAddress || "",

      admissionDate:
        admissionDate || "",

      previousInstitution:
        previousInstitution || "",

      previousClass:
        previousClass || "",

      status:
        status || "Active",

      image,
      imagePublicId,

      passwordHash,

      qrCode: null,

      createdAt: now,
      updatedAt: now,
    };

    /* =====================================================
       INSERT
    ===================================================== */

    const result =
      await db.collection("students").insertOne(
        student
      );

    const studentMongoId =
      result.insertedId.toString();

    /* =====================================================
       QR
    ===================================================== */

    const qrCode =
      await generateStudentQR(
        studentMongoId
      );

    await db
      .collection("students")
      .updateOne(
        {
          _id: result.insertedId,
        },
        {
          $set: {
            qrCode,
            updatedAt: new Date(),
          },
        }
      );

    /* =====================================================
       CREATED STUDENT
    ===================================================== */

    const createdStudent =
      await db
        .collection("students")
        .findOne({
          _id: result.insertedId,
        });

    delete createdStudent.passwordHash;

    return res.status(201).json({
      success: true,
      message:
        "Student added successfully",

      student: createdStudent,

      /* IMPORTANT */
      login: {
        studentId: idCard.trim(),
        password: generatedPassword,
      },
    });
  } catch (error) {
    console.error(
      "Add Student Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add student",
    });
  }
};

/* =========================================================
   GET ALL STUDENTS
========================================================= */

const getStudents = async (req, res) => {
  try {
    const db = getDB();

    const students =
      await db
        .collection("students")
        .find({})
        .sort({
          createdAt: -1,
        })
        .toArray();

    const safeStudents =
      students.map((student) => {
        const safeStudent = {
          ...student,
        };

        delete safeStudent.passwordHash;

        return safeStudent;
      });

    return res.status(200).json({
      success: true,
      count: safeStudents.length,
      students: safeStudents,
    });
  } catch (error) {
    console.error(
      "Get Students Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch students",
    });
  }
};

/* =========================================================
   GET SINGLE STUDENT
========================================================= */

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID",
      });
    }

    const db = getDB();

    const student =
      await db
        .collection("students")
        .findOne({
          _id: new ObjectId(id),
        });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    delete student.passwordHash;

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    console.error(
      "Get Student Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch student",
    });
  }
};

/* =========================================================
   UPDATE STUDENT
========================================================= */

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID",
      });
    }

    const db = getDB();

    const studentObjectId =
      new ObjectId(id);

    const existingStudent =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    const {
      name,
      idCard,
      roll,
      className,
      section,
      session,
      dateOfBirth,
      gender,
      bloodGroup,
      religion,
      nationality,
      fatherName,
      fatherMobile,
      motherName,
      motherMobile,
      guardianName,
      guardianMobile,
      guardianRelation,
      presentAddress,
      permanentAddress,
      admissionDate,
      previousInstitution,
      previousClass,
      status,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Student name is required",
      });
    }

    if (!idCard?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID is required",
      });
    }

    if (!className?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Class is required",
      });
    }

    /* =====================================================
       DUPLICATE ID
    ===================================================== */

    const duplicateStudent =
      await db
        .collection("students")
        .findOne({
          idCard: idCard.trim(),
          _id: {
            $ne: studentObjectId,
          },
        });

    if (duplicateStudent) {
      return res.status(409).json({
        success: false,
        message:
          "Another student already uses this Student ID",
      });
    }

    /* =====================================================
       IMAGE
    ===================================================== */

    let image =
      existingStudent.image || null;

    let imagePublicId =
      existingStudent.imagePublicId ||
      null;

    if (req.file?.buffer) {
      if (imagePublicId) {
        try {
          await cloudinary.uploader.destroy(
            imagePublicId
          );
        } catch (error) {
          console.error(
            "Old image delete error:",
            error
          );
        }
      }

      const uploadedImage =
        await uploadToCloudinary(
          req.file.buffer
        );

      image =
        uploadedImage.secure_url ||
        uploadedImage.url ||
        null;

      imagePublicId =
        uploadedImage.public_id ||
        null;
    }

    /* =====================================================
       PASSWORD
    ===================================================== */

    let passwordHash =
      existingStudent.passwordHash ||
      null;

    let generatedPassword = null;

    if (!passwordHash) {
      generatedPassword =
        generateStudentPassword();

      passwordHash =
        await bcrypt.hash(
          generatedPassword,
          10
        );
    }

    /* =====================================================
       QR
    ===================================================== */

    let qrCode =
      existingStudent.qrCode ||
      null;

    if (!qrCode) {
      qrCode =
        await generateStudentQR(id);
    }

    /* =====================================================
       UPDATE
    ===================================================== */

    const updateData = {
      name: name.trim(),
      idCard: idCard.trim(),
      roll: roll || "",
      className: className.trim(),
      section: section || "",
      session: session || "",

      dateOfBirth:
        dateOfBirth || "",

      gender: gender || "",
      bloodGroup:
        bloodGroup || "",

      religion:
        religion || "",

      nationality:
        nationality ||
        "Bangladeshi",

      fatherName:
        fatherName || "",

      fatherMobile:
        fatherMobile || "",

      motherName:
        motherName || "",

      motherMobile:
        motherMobile || "",

      guardianName:
        guardianName || "",

      guardianMobile:
        guardianMobile || "",

      guardianRelation:
        guardianRelation || "",

      presentAddress:
        presentAddress || "",

      permanentAddress:
        permanentAddress || "",

      admissionDate:
        admissionDate || "",

      previousInstitution:
        previousInstitution || "",

      previousClass:
        previousClass || "",

      status:
        status || "Active",

      image,
      imagePublicId,

      passwordHash,
      qrCode,

      updatedAt:
        new Date(),
    };

    await db
      .collection("students")
      .updateOne(
        {
          _id: studentObjectId,
        },
        {
          $set: updateData,
        }
      );

    const updatedStudent =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    delete updatedStudent.passwordHash;

    return res.status(200).json({
      success: true,
      message:
        "Student updated successfully",

      student: updatedStudent,

      login: generatedPassword
        ? {
            studentId:
              idCard.trim(),
            password:
              generatedPassword,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Update Student Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update student",
    });
  }
};

/* =========================================================
   RESET STUDENT PASSWORD
========================================================= */

const resetStudentPassword = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID",
      });
    }

    const db = getDB();

    const studentObjectId =
      new ObjectId(id);

    const student =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    /* =====================================================
       GENERATE NEW PASSWORD
    ===================================================== */

    const newPassword =
      generateStudentPassword();

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        10
      );

    /* =====================================================
       UPDATE PASSWORD
    ===================================================== */

    await db
      .collection("students")
      .updateOne(
        {
          _id: studentObjectId,
        },
        {
          $set: {
            passwordHash,
            updatedAt: new Date(),
          },
        }
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,
      message:
        "Student password reset successfully",

      login: {
        studentId:
          student.idCard,
        password:
          newPassword,
      },
    });
  } catch (error) {
    console.error(
      "Reset Student Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reset student password",
    });
  }
};

/* =========================================================
   REGENERATE STUDENT QR
========================================================= */

const regenerateStudentQR = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID",
      });
    }

    const db = getDB();

    const studentObjectId =
      new ObjectId(id);

    const student =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    const qrCode =
      await generateStudentQR(
        studentObjectId.toString()
      );

    await db
      .collection("students")
      .updateOne(
        {
          _id: studentObjectId,
        },
        {
          $set: {
            qrCode,
            updatedAt: new Date(),
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Student QR code regenerated successfully",

      qrCode,

      portalUrl:
        `${FRONTEND_URL.replace(
          /\/$/,
          ""
        )}/student/${studentObjectId}`,
    });
  } catch (error) {
    console.error(
      "Regenerate QR Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to regenerate QR code",
    });
  }
};

/* =========================================================
   DELETE STUDENT
========================================================= */

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID",
      });
    }

    const db = getDB();

    const studentObjectId =
      new ObjectId(id);

    const student =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    if (student.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          student.imagePublicId
        );
      } catch (error) {
        console.error(
          "Cloudinary delete error:",
          error
        );
      }
    }

    await db
      .collection("students")
      .deleteOne({
        _id: studentObjectId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Student deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Student Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete student",
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  addStudent,
  getStudents,
  getStudentById,
  updateStudent,
  resetStudentPassword,
  regenerateStudentQR,
  deleteStudent,
};