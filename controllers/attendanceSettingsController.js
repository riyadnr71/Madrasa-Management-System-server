const { getDB } = require("../config/db");

/* =========================================================
   GET ATTENDANCE SETTINGS
========================================================= */

const getAttendanceSettings = async (req, res) => {
  try {
    const db = getDB();

    let settings = await db
      .collection("attendanceSettings")
      .findOne({});

    if (!settings) {
      const defaultSettings = {
        season: "Summer",
        attendanceStartTime: "08:00",
        absentAfterTime: "09:00",
        lateAllowed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db
        .collection("attendanceSettings")
        .insertOne(defaultSettings);

      settings = {
        _id: result.insertedId,
        ...defaultSettings,
      };
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get Attendance Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load attendance settings.",
    });
  }
};

/* =========================================================
   UPDATE ATTENDANCE SETTINGS
========================================================= */

const updateAttendanceSettings = async (req, res) => {
  try {
    const db = getDB();

    const {
      season = "Summer",
      attendanceStartTime = "08:00",
      absentAfterTime = "09:00",
      lateAllowed = true,
    } = req.body;

    if (!attendanceStartTime || !absentAfterTime) {
      return res.status(400).json({
        success: false,
        message: "Attendance time settings are required.",
      });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !timeRegex.test(attendanceStartTime) ||
      !timeRegex.test(absentAfterTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Time must be in HH:mm format.",
      });
    }

    if (attendanceStartTime >= absentAfterTime) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance start time must be earlier than absent after time.",
      });
    }

    const updateData = {
      season: String(season).trim() || "Summer",
      attendanceStartTime,
      absentAfterTime,
      lateAllowed: Boolean(lateAllowed),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("attendanceSettings")
      .findOneAndUpdate(
        {},
        {
          $set: updateData,
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

    return res.status(200).json({
      success: true,
      message: "Attendance settings updated successfully.",
      settings: result.value || result,
    });
  } catch (error) {
    console.error("Update Attendance Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update attendance settings.",
    });
  }
};

module.exports = {
  getAttendanceSettings,
  updateAttendanceSettings,
};