
const { ObjectId } = require("mongodb");
const { Readable } = require("stream");

const { getDB } = require("../config/db");
const cloudinary = require("../config/cloudinary");

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

    Readable.from(fileBuffer).pipe(
      uploadStream
    );
  });
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

    /* ================= VALIDATION ================= */

    if (
      !name?.trim() ||
      !idCard?.trim() ||
      !className?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student name, student ID and class are required",
      });
    }

    /* ================= DUPLICATE ID ================= */

    const existingStudent =
      await db.collection("students").findOne({
        idCard: idCard.trim(),
      });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message:
          "A student with this ID already exists",
      });
    }

    /* ================= IMAGE ================= */

    let image = null;
    let imagePublicId = null;

    console.log(
      "Received file:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "NO FILE"
    );

    if (req.file) {
      try {
        const uploadedImage =
          await uploadToCloudinary(
            req.file.buffer
          );

        image =
          uploadedImage.secure_url;

        imagePublicId =
          uploadedImage.public_id;

        console.log(
          "Cloudinary Upload Success:",
          {
            image,
            imagePublicId,
          }
        );
      } catch (uploadError) {
        console.error(
          "Cloudinary Upload Error:",
          uploadError
        );

        return res.status(500).json({
          success: false,
          message:
            "Student image upload failed",
        });
      }
    }

    /* ================= STUDENT ================= */

    const now = new Date();

    const student = {
      name: name.trim(),
      idCard: idCard.trim(),
      roll: roll?.trim() || "",
      className: className.trim(),
      section: section?.trim() || "",
      session: session?.trim() || "",

      dateOfBirth: dateOfBirth || "",
      gender: gender || "",
      bloodGroup: bloodGroup || "",
      religion: religion || "",
      nationality:
        nationality?.trim() ||
        "Bangladeshi",

      fatherName:
        fatherName?.trim() || "",
      fatherMobile:
        fatherMobile?.trim() || "",

      motherName:
        motherName?.trim() || "",
      motherMobile:
        motherMobile?.trim() || "",

      guardianName:
        guardianName?.trim() || "",
      guardianMobile:
        guardianMobile?.trim() || "",
      guardianRelation:
        guardianRelation?.trim() || "",

      presentAddress:
        presentAddress?.trim() || "",
      permanentAddress:
        permanentAddress?.trim() || "",

      admissionDate:
        admissionDate || "",
      previousInstitution:
        previousInstitution?.trim() || "",
      previousClass:
        previousClass?.trim() || "",

      status: status || "Active",

      image,
      imagePublicId,

      createdAt: now,
      updatedAt: now,
    };

    /* ================= INSERT ================= */

    const result = await db
      .collection("students")
      .insertOne(student);

    return res.status(201).json({
      success: true,
      message:
        "Student added successfully",
      student: {
        ...student,
        _id: result.insertedId,
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
      error: error.message,
    });
  }
};

/* =========================================================
   GET STUDENTS
========================================================= */

const getStudents = async (req, res) => {
  try {
    const db = getDB();

    const students = await db
      .collection("students")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
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
      error: error.message,
    });
  }
};

/* =========================================================
   GET STUDENT BY ID
========================================================= */

const getStudentById = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const student =
      await db.collection("students").findOne({
        _id: new ObjectId(id),
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

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
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE STUDENT
========================================================= */

const updateStudent = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const studentId =
      new ObjectId(id);

    const existingStudent =
      await db.collection("students").findOne({
        _id: studentId,
      });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
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

    /* ================= VALIDATION ================= */

    if (
      !name?.trim() ||
      !idCard?.trim() ||
      !className?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student name, student ID and class are required",
      });
    }

    /* ================= DUPLICATE ID ================= */

    const duplicateStudent =
      await db.collection("students").findOne({
        idCard: idCard.trim(),
        _id: {
          $ne: studentId,
        },
      });

    if (duplicateStudent) {
      return res.status(409).json({
        success: false,
        message:
          "Another student already uses this ID",
      });
    }

    /* ================= OLD IMAGE ================= */

    let image =
      existingStudent.image || null;

    let imagePublicId =
      existingStudent.imagePublicId ||
      null;

    let newUploadedPublicId = null;

    /* ================= NEW IMAGE ================= */

    if (req.file) {
      try {
        console.log(
          "Update received file:",
          req.file.originalname
        );

        const uploadedImage =
          await uploadToCloudinary(
            req.file.buffer
          );

        image =
          uploadedImage.secure_url;

        imagePublicId =
          uploadedImage.public_id;

        newUploadedPublicId =
          uploadedImage.public_id;
      } catch (uploadError) {
        console.error(
          "Cloudinary Update Upload Error:",
          uploadError
        );

        return res.status(500).json({
          success: false,
          message:
            "Student image upload failed",
        });
      }
    }

    /* ================= UPDATE DATA ================= */

    const updateData = {
      name: name.trim(),
      idCard: idCard.trim(),
      roll: roll?.trim() || "",
      className: className.trim(),
      section: section?.trim() || "",
      session: session?.trim() || "",

      dateOfBirth: dateOfBirth || "",
      gender: gender || "",
      bloodGroup: bloodGroup || "",
      religion: religion || "",
      nationality:
        nationality?.trim() ||
        "Bangladeshi",

      fatherName:
        fatherName?.trim() || "",
      fatherMobile:
        fatherMobile?.trim() || "",

      motherName:
        motherName?.trim() || "",
      motherMobile:
        motherMobile?.trim() || "",

      guardianName:
        guardianName?.trim() || "",
      guardianMobile:
        guardianMobile?.trim() || "",
      guardianRelation:
        guardianRelation?.trim() || "",

      presentAddress:
        presentAddress?.trim() || "",
      permanentAddress:
        permanentAddress?.trim() || "",

      admissionDate:
        admissionDate || "",
      previousInstitution:
        previousInstitution?.trim() || "",
      previousClass:
        previousClass?.trim() || "",

      status: status || "Active",

      image,
      imagePublicId,

      updatedAt: new Date(),
    };

    /* ================= UPDATE ================= */

    await db
      .collection("students")
      .updateOne(
        { _id: studentId },
        {
          $set: updateData,
        }
      );

    /* ================= DELETE OLD IMAGE ================= */

    if (
      req.file &&
      existingStudent.imagePublicId &&
      existingStudent.imagePublicId !==
        newUploadedPublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          existingStudent.imagePublicId
        );

        console.log(
          "Old Cloudinary image deleted"
        );
      } catch (deleteError) {
        console.error(
          "Old image delete error:",
          deleteError.message
        );
      }
    }

    /* ================= RESPONSE ================= */

    const updatedStudent =
      await db.collection("students").findOne({
        _id: studentId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Student updated successfully",
      student: updatedStudent,
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
      error: error.message,
    });
  }
};

/* =========================================================
   DELETE STUDENT
========================================================= */

const deleteStudent = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const studentId =
      new ObjectId(id);

    const student =
      await db.collection("students").findOne({
        _id: studentId,
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await db
      .collection("students")
      .deleteOne({
        _id: studentId,
      });

    /* ================= CLOUDINARY ================= */

    if (student.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          student.imagePublicId
        );
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary Delete Error:",
          cloudinaryError.message
        );
      }
    }

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
      error: error.message,
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
  deleteStudent,
};

