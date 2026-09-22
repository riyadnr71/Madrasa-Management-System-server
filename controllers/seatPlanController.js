const { getDB } = require("../config/db");

/* =========================================================
   GET SEAT PLAN BY CLASS
========================================================= */

const getSeatPlan = async (req, res) => {
  try {
    const db = getDB();

    const { className } = req.query;

    /* ================= VALIDATION ================= */

    if (!className?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    /* ================= GET STUDENTS ================= */

    const students = await db
      .collection("students")
      .find({
        className: className.trim(),
        status: "Active",
      })
      .toArray();

    /* ================= SORT BY ROLL ================= */

    students.sort((a, b) => {
      const rollA = parseInt(a.roll, 10);
      const rollB = parseInt(b.roll, 10);

      if (!isNaN(rollA) && !isNaN(rollB)) {
        return rollA - rollB;
      }

      return String(a.roll || "").localeCompare(
        String(b.roll || ""),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );
    });

    /* ================= RESPONSE ================= */

    return res.status(200).json({
      success: true,
      className: className.trim(),
      count: students.length,
      students,
    });
  } catch (error) {
    console.error(
      "Get Seat Plan Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate seat plan",
      error: error.message,
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getSeatPlan,
};