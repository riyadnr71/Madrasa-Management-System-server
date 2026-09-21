const { getDB } = require("../config/db");

// =====================================================
// RESULT REPORT
// =====================================================

const getResultReport = async (req, res) => {
  try {
    const db = getDB();

    const {
      className = "",
      month = "",
      examName = "",
      year = "",
    } = req.query;

    if (!className || !month || !examName || !year) {
      return res.status(400).json({
        success: false,
        message:
          "Class, Month, Exam Name and Year are required.",
      });
    }

    const selectedClass = String(className).trim();
    const selectedMonth = String(month).trim();
    const selectedExam = String(examName).trim();
    const selectedYear = String(year).trim();

    // =====================================================
    // GET STUDENTS
    // =====================================================

    const students = await db
      .collection("students")
      .find({
        className: selectedClass,
      })
      .sort({
        roll: 1,
      })
      .toArray();

    console.log("RESULT REPORT FILTER:", {
      className: selectedClass,
      month: selectedMonth,
      examName: selectedExam,
      year: selectedYear,
    });

    console.log(
      "CLASS STUDENTS:",
      students.length
    );

    if (!students.length) {
      return res.status(200).json({
        success: true,
        report: {
          className: selectedClass,
          month: selectedMonth,
          examName: selectedExam,
          year: selectedYear,
          totalStudents: 0,
          totalResults: 0,
          passed: 0,
          failed: 0,
          students: [],
        },
      });
    }

    // =====================================================
    // STUDENT IDS
    // =====================================================

    const studentObjectIds = students
      .map((student) => student._id)
      .filter(Boolean);

    const studentStringIds = students.map(
      (student) => String(student._id)
    );

    // =====================================================
    // GET RESULTS
    // studentId -> ObjectId OR String
    // year -> String OR Number
    // =====================================================

    const results = await db
      .collection("results")
      .find({
        $and: [
          {
            $or: [
              {
                studentId: {
                  $in: studentObjectIds,
                },
              },
              {
                studentId: {
                  $in: studentStringIds,
                },
              },
            ],
          },

          {
            month: selectedMonth,
          },

          {
            examName: selectedExam,
          },

          {
            $or: [
              {
                year: selectedYear,
              },
              {
                year: Number(selectedYear),
              },
            ],
          },
        ],
      })
      .toArray();

    console.log(
      "RESULTS FOUND:",
      results.length
    );

    console.log(
      "RESULT SAMPLE:",
      results[0]
    );

    // =====================================================
    // RESULT MAP
    // =====================================================

    const resultMap = new Map();

    results.forEach((result) => {
      if (!result.studentId) {
        return;
      }

      resultMap.set(
        String(result.studentId),
        result
      );
    });

    // =====================================================
    // MERGE STUDENT + RESULT
    // =====================================================

    const reportStudents = students.map(
      (student) => {
        const studentKey =
          String(student._id);

        const result =
          resultMap.get(studentKey) || null;

        return {
          studentId: studentKey,

          idCard:
            student.idCard ||
            "",

          name:
            student.name ||
            "",

          roll:
            student.roll ||
            "",

          className:
            student.className ||
            "",

          image:
            student.image ||
            "",

          result,
        };
      }
    );

    // =====================================================
    // STUDENTS WITH RESULT
    // =====================================================

    const studentsWithResult =
      reportStudents.filter(
        (student) => student.result
      );

    // =====================================================
    // PASSED
    // =====================================================

    const passed =
      studentsWithResult.filter(
        (student) =>
          String(
            student.result?.status || ""
          ).toLowerCase() === "pass"
      ).length;

    // =====================================================
    // FAILED
    // =====================================================

    const failed =
      studentsWithResult.filter(
        (student) =>
          String(
            student.result?.status || ""
          ).toLowerCase() === "fail"
      ).length;

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,

      report: {
        className: selectedClass,

        month: selectedMonth,

        examName: selectedExam,

        year: selectedYear,

        totalStudents:
          reportStudents.length,

        totalResults:
          studentsWithResult.length,

        passed,

        failed,

        students:
          reportStudents,
      },
    });
  } catch (error) {
    console.error(
      "Get Result Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate result report.",
      error: error.message,
    });
  }
};

// =====================================================
// FEE REPORT
// =====================================================

const getFeeReport = async (req, res) => {
  try {
    const db = getDB();

    const {
      className = "",
      month = "",
      year = "",
    } = req.query;

    if (!className || !month || !year) {
      return res.status(400).json({
        success: false,
        message:
          "Class, Month and Year are required.",
      });
    }

    const selectedClass = String(className).trim();
    const selectedMonth = String(month).trim();
    const selectedYear = String(year).trim();

    const students = await db
      .collection("students")
      .find({
        className: selectedClass,
      })
      .sort({ roll: 1 })
      .toArray();

    const studentObjectIds = students
      .map((student) => student._id)
      .filter(Boolean);

    const studentStringIds = students.map(
      (student) => String(student._id)
    );

    const fees = await db
      .collection("fees")
      .find({
        month: selectedMonth,
        $or: [
          { year: selectedYear },
          { year: Number(selectedYear) },
        ],
        $or: [
          {
            studentId: {
              $in: studentObjectIds,
            },
          },
          {
            studentId: {
              $in: studentStringIds,
            },
          },
        ],
      })
      .toArray();

    const feeMap = new Map();

    fees.forEach((fee) => {
      if (fee.studentId) {
        feeMap.set(
          String(fee.studentId),
          fee
        );
      }
    });

    const reportStudents = students.map(
      (student) => ({
        studentId: String(student._id),
        idCard: student.idCard || "",
        roll: student.roll || "",
        name: student.name || "",
        className: student.className || "",
        fee:
          feeMap.get(String(student._id)) ||
          null,
      })
    );

    return res.status(200).json({
      success: true,
      report: {
        className: selectedClass,
        month: selectedMonth,
        year: selectedYear,
        totalStudents: students.length,
        totalFees: fees.length,
        students: reportStudents,
      },
    });
  } catch (error) {
    console.error(
      "Get Fee Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate fee report.",
      error: error.message,
    });
  }
};

// =====================================================
// EXPENSE REPORT
// =====================================================

const getExpenseReport = async (req, res) => {
  try {
    const db = getDB();

    const {
      month = "",
      year = "",
    } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and Year are required.",
      });
    }

    const selectedMonth = String(month).trim();
    const selectedYear = String(year).trim();

    const expenses = await db
      .collection("expenses")
      .find({
        month: selectedMonth,
        $or: [
          { year: selectedYear },
          { year: Number(selectedYear) },
        ],
      })
      .sort({
        expenseDate: 1,
        createdAt: 1,
      })
      .toArray();

    const totalExpenses =
      expenses.reduce(
        (sum, expense) =>
          sum + (Number(expense.amount) || 0),
        0
      );

    return res.status(200).json({
      success: true,
      report: {
        month: selectedMonth,
        year: selectedYear,
        totalExpenses,
        totalRecords: expenses.length,
        expenses,
      },
    });
  } catch (error) {
    console.error(
      "Get Expense Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate expense report.",
      error: error.message,
    });
  }
};

// =====================================================
// FINANCIAL REPORT
// =====================================================

const getFinancialReport = async (req, res) => {
  try {
    const db = getDB();

    const {
      month = "",
      year = "",
    } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and Year are required.",
      });
    }

    const selectedMonth = String(month).trim();
    const selectedYear = String(year).trim();

    // =====================================================
    // FEES
    // =====================================================

    const fees = await db
      .collection("fees")
      .find({
        month: selectedMonth,
        $or: [
          { year: selectedYear },
          { year: Number(selectedYear) },
        ],
      })
      .toArray();

    const totalCollected =
      fees.reduce(
        (sum, fee) =>
          sum + (Number(fee.paidAmount) || 0),
        0
      );

    // =====================================================
    // EXPENSES
    // =====================================================

    const expenses = await db
      .collection("expenses")
      .find({
        month: selectedMonth,
        $or: [
          { year: selectedYear },
          { year: Number(selectedYear) },
        ],
      })
      .toArray();

    const totalExpenses =
      expenses.reduce(
        (sum, expense) =>
          sum + (Number(expense.amount) || 0),
        0
      );

    const profitLoss =
      totalCollected - totalExpenses;

    return res.status(200).json({
      success: true,
      report: {
        month: selectedMonth,
        year: selectedYear,

        totalCollected,
        totalExpenses,

        profitLoss,

        financialStatus:
          profitLoss >= 0
            ? "Profit"
            : "Loss",
      },
    });
  } catch (error) {
    console.error(
      "Get Financial Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate financial report.",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getResultReport,
  getFeeReport,
  getExpenseReport,
  getFinancialReport,
};