const { ObjectId } = require("mongodb");
const { Readable } = require("stream");

const { getDB } = require("../config/db");
const cloudinary = require("../config/cloudinary");

/* =========================================================
   CLOUDINARY UPLOAD
========================================================= */

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
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

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

/* =========================================================
   GENERATE TEACHER ID
   T-0001, T-0002, T-0003...
========================================================= */

const generateTeacherId = async (teachersCollection) => {
  const lastTeacher = await teachersCollection
    .find({})
    .sort({ teacherId: -1 })
    .limit(1)
    .toArray();

  if (!lastTeacher.length || !lastTeacher[0].teacherId) {
    return "T-0001";
  }

  const lastId = lastTeacher[0].teacherId;

  const match = String(lastId).match(/T-(\d+)/i);

  if (!match) {
    const count = await teachersCollection.countDocuments();

    return `T-${String(count + 1).padStart(4, "0")}`;
  }

  const nextNumber = Number(match[1]) + 1;

  return `T-${String(nextNumber).padStart(4, "0")}`;
};

/* =========================================================
   ➕ ADD TEACHER
========================================================= */

const addTeacher = async (req, res) => {
  try {
    const db = getDB();
    const teachersCollection = db.collection("teachers");

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
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Teacher name is required",
      });
    }

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!designation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Designation is required",
      });
    }

    /* ================= TEACHER ID ================= */

    const teacherId = await generateTeacherId(
      teachersCollection
    );

    /* ================= IMAGE ================= */

    let image = null;
    let imagePublicId = null;

    console.log(
      "Received teacher file:",
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
        const uploadedImage = await uploadToCloudinary(
          req.file.buffer
        );

        image = uploadedImage.secure_url;
        imagePublicId = uploadedImage.public_id;

        console.log("Teacher Cloudinary Upload Success:", {
          image,
          imagePublicId,
        });
      } catch (uploadError) {
        console.error(
          "Teacher Cloudinary Upload Error:",
          uploadError
        );

        return res.status(500).json({
          success: false,
          message: "Teacher image upload failed",
        });
      }
    }

    /* ================= TEACHER DATA ================= */

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

      joiningDate: joiningDate || "",

      address: address?.trim() || "",

      status: status || "Active",

      note: note?.trim() || "",

      image,
      imagePublicId,

      createdAt: now,
      updatedAt: now,
    };

    /* ================= INSERT ================= */

    const result = await teachersCollection.insertOne(
      teacher
    );

    return res.status(201).json({
      success: true,
      message: "Teacher added successfully",

      teacher: {
        ...teacher,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Add Teacher Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add teacher",
      error: error.message,
    });
  }
};

/* =========================================================
   📄 GET ALL TEACHERS
========================================================= */

const getTeachers = async (req, res) => {
  try {
    const db = getDB();

    const teachers = await db
      .collection("teachers")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Get Teachers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch teachers",
      error: error.message,
    });
  }
};

/* =========================================================
   📄 GET TEACHER BY ID
========================================================= */

const getTeacherById = async (req, res) => {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID",
      });
    }

    const teacher = await db
      .collection("teachers")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    return res.status(200).json({
      success: true,
      teacher,
    });
  } catch (error) {
    console.error("Get Teacher Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher",
      error: error.message,
    });
  }
};

/* =========================================================
   ✏️ UPDATE TEACHER
========================================================= */

const updateTeacher = async (req, res) => {
  try {
    const db = getDB();

    const teachersCollection =
      db.collection("teachers");

    const { id } = req.params;

    /* ================= VALIDATE ID ================= */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID",
      });
    }

    const teacherObjectId = new ObjectId(id);

    /* ================= FIND TEACHER ================= */

    const existingTeacher =
      await teachersCollection.findOne({
        _id: teacherObjectId,
      });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
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
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Teacher name is required",
      });
    }

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!designation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Designation is required",
      });
    }

    /* ================= OLD IMAGE ================= */

    let image = existingTeacher.image || null;

    let imagePublicId =
      existingTeacher.imagePublicId || null;

    let newUploadedPublicId = null;

    /* ================= NEW IMAGE ================= */

    if (req.file) {
      try {
        console.log(
          "Teacher update received file:",
          req.file.originalname
        );

        const uploadedImage =
          await uploadToCloudinary(
            req.file.buffer
          );

        image = uploadedImage.secure_url;

        imagePublicId =
          uploadedImage.public_id;

        newUploadedPublicId =
          uploadedImage.public_id;

        console.log(
          "Teacher image updated:",
          {
            image,
            imagePublicId,
          }
        );
      } catch (uploadError) {
        console.error(
          "Teacher Cloudinary Update Error:",
          uploadError
        );

        return res.status(500).json({
          success: false,
          message: "Teacher image upload failed",
        });
      }
    }

    /* ================= UPDATE DATA ================= */

    const updateData = {
      // Teacher ID never changes
      teacherId:
        existingTeacher.teacherId || "",

      name: name.trim(),

      subject: subject.trim(),

      designation: designation.trim(),

      qualification:
        qualification?.trim() || "",

      salary: Number(salary || 0),

      mobile: mobile?.trim() || "",

      joiningDate: joiningDate || "",

      address: address?.trim() || "",

      status: status || "Active",

      note: note?.trim() || "",

      image,

      imagePublicId,

      updatedAt: new Date(),
    };

    /* ================= UPDATE ================= */

    await teachersCollection.updateOne(
      {
        _id: teacherObjectId,
      },
      {
        $set: updateData,
      }
    );

    /* ================= DELETE OLD IMAGE ================= */

    if (
      req.file &&
      existingTeacher.imagePublicId &&
      existingTeacher.imagePublicId !==
        newUploadedPublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          existingTeacher.imagePublicId
        );

        console.log(
          "Old teacher Cloudinary image deleted"
        );
      } catch (deleteError) {
        console.error(
          "Old teacher image delete error:",
          deleteError.message
        );
      }
    }

    /* ================= GET UPDATED ================= */

    const updatedTeacher =
      await teachersCollection.findOne({
        _id: teacherObjectId,
      });

    return res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      teacher: updatedTeacher,
    });
  } catch (error) {
    console.error(
      "Update Teacher Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update teacher",
      error: error.message,
    });
  }
};

/* =========================================================
   🗑️ DELETE TEACHER
========================================================= */

const deleteTeacher = async (req, res) => {
  try {
    const db = getDB();

    const teachersCollection =
      db.collection("teachers");

    const { id } = req.params;

    /* ================= VALIDATE ID ================= */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID",
      });
    }

    const teacherObjectId = new ObjectId(id);

    /* ================= FIND TEACHER ================= */

    const teacher =
      await teachersCollection.findOne({
        _id: teacherObjectId,
      });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    /* ================= DELETE DATABASE ================= */

    await teachersCollection.deleteOne({
      _id: teacherObjectId,
    });

    /* ================= DELETE CLOUDINARY ================= */

    if (teacher.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          teacher.imagePublicId
        );

        console.log(
          "Teacher Cloudinary image deleted"
        );
      } catch (cloudinaryError) {
        console.error(
          "Teacher Cloudinary Delete Error:",
          cloudinaryError.message
        );
      }
    }

    /* ================= RESPONSE ================= */

    return res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Teacher Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete teacher",
      error: error.message,
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};