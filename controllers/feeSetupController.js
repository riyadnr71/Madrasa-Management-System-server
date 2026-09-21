const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const getCollection = () => {
  return getDB().collection("feeSetups");
};

/* =========================================================
   CLASS NORMALIZATION
========================================================= */

const CLASS_MAP = {
  play: "Play",
  nursery: "Play",
  kg: "KG",

  "1": "One",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",

  one: "One",
  two: "Two",
  three: "Three",
  four: "Four",
  five: "Five",
  six: "Six",
  seven: "Seven",
  eight: "Eight",
  nine: "Nine",
  ten: "Ten",
};

const normalizeClassName = (value = "") => {
  const raw = String(value).trim();

  if (!raw) return "";

  const lower = raw.toLowerCase();

  if (CLASS_MAP[lower]) {
    return CLASS_MAP[lower];
  }

  const classMatch = lower.match(/^class\s*(\d+)$/);

  if (classMatch && CLASS_MAP[classMatch[1]]) {
    return CLASS_MAP[classMatch[1]];
  }

  return raw;
};

/* =========================================================
   FIND EXISTING SETUP
   Supports:
   Six
   6
   Class 6
========================================================= */

const findExistingSetup = async (className, excludeId = null) => {
  const normalized = normalizeClassName(className);

  const allSetups = await getCollection()
    .find({})
    .toArray();

  return (
    allSetups.find((setup) => {
      if (
        excludeId &&
        String(setup._id) === String(excludeId)
      ) {
        return false;
      }

      return (
        normalizeClassName(setup.className) ===
        normalized
      );
    }) || null
  );
};

/* =========================================================
   ADD FEE SETUP
========================================================= */

const addFeeSetup = async (req, res) => {
  try {
    const { className, monthlyFee } = req.body;

    const normalizedClass = normalizeClassName(className);

    if (!normalizedClass) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    const fee = Number(monthlyFee);

    if (!Number.isFinite(fee) || fee <= 0) {
      return res.status(400).json({
        success: false,
        message: "Monthly fee must be greater than 0",
      });
    }

    /* -------------------------------------------------------
       CHECK EXISTING SETUP
    ------------------------------------------------------- */

    const existing = await findExistingSetup(
      normalizedClass
    );

    if (existing) {
      /*
        Instead of creating another setup, update the
        existing setup.

        This makes the Add/Save button user-friendly and
        prevents duplicate class fee setups.
      */

      await getCollection().updateOne(
        {
          _id: existing._id,
        },
        {
          $set: {
            className: normalizedClass,
            monthlyFee: fee,
            updatedAt: new Date(),
          },
        }
      );

      const updatedFeeSetup =
        await getCollection().findOne({
          _id: existing._id,
        });

      return res.status(200).json({
        success: true,
        updated: true,
        message: "Fee setup updated successfully",
        feeSetup: updatedFeeSetup,
      });
    }

    /* -------------------------------------------------------
       CREATE NEW SETUP
    ------------------------------------------------------- */

    const feeSetup = {
      className: normalizedClass,
      monthlyFee: fee,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result =
      await getCollection().insertOne(feeSetup);

    return res.status(201).json({
      success: true,
      created: true,
      message: "Fee setup added successfully",
      feeSetup: {
        _id: result.insertedId,
        ...feeSetup,
      },
    });
  } catch (error) {
    console.error(
      "Add Fee Setup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to save fee setup",
    });
  }
};

/* =========================================================
   GET ALL FEE SETUPS
========================================================= */

const getFeeSetups = async (req, res) => {
  try {
    const feeSetups = await getCollection()
      .find({})
      .sort({ className: 1 })
      .toArray();

    return res.status(200).json({
      success: true,
      feeSetups,
    });
  } catch (error) {
    console.error(
      "Get Fee Setups Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load fee setups",
    });
  }
};

/* =========================================================
   GET FEE SETUP BY CLASS
========================================================= */

const getFeeSetupByClass = async (req, res) => {
  try {
    const { className } = req.params;

    const normalizedClass =
      normalizeClassName(
        decodeURIComponent(className || "")
      );

    if (!normalizedClass) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    const feeSetup =
      await findExistingSetup(
        normalizedClass
      );

    if (!feeSetup) {
      return res.status(404).json({
        success: false,
        message:
          "Fee setup not found for this class",
      });
    }

    return res.status(200).json({
      success: true,
      feeSetup,
    });
  } catch (error) {
    console.error(
      "Get Fee Setup By Class Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load fee setup",
    });
  }
};

/* =========================================================
   UPDATE FEE SETUP
========================================================= */

const updateFeeSetup = async (req, res) => {
  try {
    const { id } = req.params;
    const { className, monthlyFee } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee setup ID",
      });
    }

    const normalizedClass =
      normalizeClassName(className);

    if (!normalizedClass) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    const fee = Number(monthlyFee);

    if (!Number.isFinite(fee) || fee <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly fee must be greater than 0",
      });
    }

    const objectId = new ObjectId(id);

    const existing =
      await getCollection().findOne({
        _id: objectId,
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Fee setup not found",
      });
    }

    const duplicate =
      await findExistingSetup(
        normalizedClass,
        objectId
      );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Fee setup already exists for this class",
      });
    }

    await getCollection().updateOne(
      {
        _id: objectId,
      },
      {
        $set: {
          className: normalizedClass,
          monthlyFee: fee,
          updatedAt: new Date(),
        },
      }
    );

    const updatedFeeSetup =
      await getCollection().findOne({
        _id: objectId,
      });

    return res.status(200).json({
      success: true,
      message: "Fee setup updated successfully",
      feeSetup: updatedFeeSetup,
    });
  } catch (error) {
    console.error(
      "Update Fee Setup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update fee setup",
    });
  }
};

/* =========================================================
   DELETE FEE SETUP
========================================================= */

const deleteFeeSetup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee setup ID",
      });
    }

    const result =
      await getCollection().deleteOne({
        _id: new ObjectId(id),
      });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Fee setup not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee setup deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Fee Setup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete fee setup",
    });
  }
};

module.exports = {
  addFeeSetup,
  getFeeSetups,
  getFeeSetupByClass,
  updateFeeSetup,
  deleteFeeSetup,
};