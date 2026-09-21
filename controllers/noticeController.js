const { ObjectId } = require("mongodb");
const { Readable } = require("stream");

const { getDB } = require("../config/db");
const cloudinary = require("../config/cloudinary");

// =========================================================
// CONSTANTS
// =========================================================

const NOTICE_TYPES = [
  "General Notice",
  "Exam",
  "Holiday",
  "Meeting",
  "Event",
  "Important",
  "Other",
];

const NOTICE_STATUS = ["Published", "Draft"];

// =========================================================
// CLOUDINARY UPLOAD
// =========================================================

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "madrasa/notices",
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

// =========================================================
// GENERATE NOTICE ID
// =========================================================

const generateNoticeId = async () => {
  const db = getDB();
  const noticesCollection = db.collection("notices");

  const lastNotice = await noticesCollection.findOne(
    {},
    {
      sort: {
        createdAt: -1,
      },
    }
  );

  if (!lastNotice?.noticeId) {
    return "NOTICE-0001";
  }

  const lastNumber = parseInt(
    String(lastNotice.noticeId).replace("NOTICE-", ""),
    10
  );

  const nextNumber = Number.isFinite(lastNumber)
    ? lastNumber + 1
    : 1;

  return `NOTICE-${String(nextNumber).padStart(4, "0")}`;
};

// =========================================================
// ADD NOTICE
// =========================================================

const addNotice = async (req, res) => {
  try {
    const db = getDB();
    const noticesCollection = db.collection("notices");

    const {
      title,
      noticeType,
      noticeDate,
      publishDate,
      description,
      status,
    } = req.body;

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required",
      });
    }

    if (!noticeType?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice type is required",
      });
    }

    if (!NOTICE_TYPES.includes(noticeType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice type",
      });
    }

    if (!noticeDate) {
      return res.status(400).json({
        success: false,
        message: "Notice date is required",
      });
    }

    if (!publishDate) {
      return res.status(400).json({
        success: false,
        message: "Publish date is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice description is required",
      });
    }

    const cleanStatus = NOTICE_STATUS.includes(status)
      ? status
      : "Draft";

    // -------------------------------------------------------
    // IMAGE UPLOAD
    // -------------------------------------------------------

    let image = "";
    let imagePublicId = "";

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file.buffer
      );

      image = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    // -------------------------------------------------------
    // NOTICE ID
    // -------------------------------------------------------

    const noticeId = await generateNoticeId();

    // -------------------------------------------------------
    // DOCUMENT
    // -------------------------------------------------------

    const noticeData = {
      noticeId,

      title: title.trim(),

      noticeType: noticeType.trim(),

      noticeDate: String(noticeDate).trim(),

      publishDate: String(publishDate).trim(),

      description: description.trim(),

      status: cleanStatus,

      image,

      imagePublicId,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const result = await noticesCollection.insertOne(
      noticeData
    );

    return res.status(201).json({
      success: true,
      message: "Notice added successfully",
      notice: {
        _id: result.insertedId,
        ...noticeData,
      },
    });
  } catch (error) {
    console.error("Add Notice Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add notice",
    });
  }
};

// =========================================================
// GET ALL NOTICES - ADMIN
// =========================================================

const getNotices = async (req, res) => {
  try {
    const db = getDB();

    const notices = await db
      .collection("notices")
      .find({})
      .sort({
        publishDate: -1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      notices,
    });
  } catch (error) {
    console.error("Get Notices Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notices",
    });
  }
};

// =========================================================
// GET SINGLE NOTICE - ADMIN
// =========================================================

const getNoticeById = async (req, res) => {
  try {
    const db = getDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice = await db
      .collection("notices")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    return res.status(200).json({
      success: true,
      notice,
    });
  } catch (error) {
    console.error("Get Notice Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notice",
    });
  }
};

// =========================================================
// UPDATE NOTICE
// =========================================================

const updateNotice = async (req, res) => {
  try {
    const db = getDB();

    const noticesCollection = db.collection("notices");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const existingNotice = await noticesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const {
      title,
      noticeType,
      noticeDate,
      publishDate,
      description,
      status,
    } = req.body;

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required",
      });
    }

    if (!noticeType?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice type is required",
      });
    }

    if (!NOTICE_TYPES.includes(noticeType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice type",
      });
    }

    if (!noticeDate) {
      return res.status(400).json({
        success: false,
        message: "Notice date is required",
      });
    }

    if (!publishDate) {
      return res.status(400).json({
        success: false,
        message: "Publish date is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice description is required",
      });
    }

    const cleanStatus = NOTICE_STATUS.includes(status)
      ? status
      : "Draft";

    // -------------------------------------------------------
    // UPDATE DATA
    // -------------------------------------------------------

    const updateData = {
      title: title.trim(),
      noticeType: noticeType.trim(),
      noticeDate: String(noticeDate).trim(),
      publishDate: String(publishDate).trim(),
      description: description.trim(),
      status: cleanStatus,
      updatedAt: new Date(),
    };

    // -------------------------------------------------------
    // NEW IMAGE
    // -------------------------------------------------------

    let newImagePublicId = null;

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file.buffer
      );

      updateData.image = uploaded.secure_url;
      updateData.imagePublicId = uploaded.public_id;

      newImagePublicId = uploaded.public_id;
    }

    await noticesCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      }
    );

    // -------------------------------------------------------
    // DELETE OLD IMAGE
    // -------------------------------------------------------

    if (
      req.file &&
      existingNotice.imagePublicId &&
      newImagePublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          existingNotice.imagePublicId,
          {
            resource_type: "image",
          }
        );
      } catch (cloudinaryError) {
        console.error(
          "Old Notice Image Delete Error:",
          cloudinaryError.message
        );
      }
    }

    const updatedNotice =
      await noticesCollection.findOne({
        _id: new ObjectId(id),
      });

    return res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      notice: updatedNotice,
    });
  } catch (error) {
    console.error("Update Notice Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notice",
    });
  }
};

// =========================================================
// DELETE NOTICE
// =========================================================

const deleteNotice = async (req, res) => {
  try {
    const db = getDB();

    const noticesCollection = db.collection("notices");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice = await noticesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    await noticesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Delete Cloudinary image
    if (notice.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          notice.imagePublicId,
          {
            resource_type: "image",
          }
        );
      } catch (cloudinaryError) {
        console.error(
          "Notice Image Delete Error:",
          cloudinaryError.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    console.error("Delete Notice Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notice",
    });
  }
};

// =========================================================
// PUBLIC NOTICES
// শুধুমাত্র Published Notice
// =========================================================

const getPublicNotices = async (req, res) => {
  try {
    const db = getDB();

    const today = new Date()
      .toISOString()
      .split("T")[0];

    const notices = await db
      .collection("notices")
      .find({
        status: "Published",
        publishDate: {
          $lte: today,
        },
      })
      .sort({
        publishDate: -1,
        noticeDate: -1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      notices,
    });
  } catch (error) {
    console.error("Public Notices Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch public notices",
    });
  }
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  addNotice,
  getNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  getPublicNotices,
};