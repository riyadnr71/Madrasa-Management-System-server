
const { getDB } = require("../config/db");

// =========================================================
// DASHBOARD SUMMARY
// =========================================================
// GET /api/dashboard?month=September&year=2026
// =========================================================

const getDashboard = async (req, res) => {
  try {
    const db = getDB();

    const studentsCollection = db.collection("students");
    const teachersCollection = db.collection("teachers");
    const resultsCollection = db.collection("results");
    const feesCollection = db.collection("fees");
    const expensesCollection = db.collection("expenses");

    // =======================================================
    // CURRENT MONTH / YEAR
    // =======================================================

    const now = new Date();

    const selectedMonth =
      String(req.query.month || "").trim() ||
      now.toLocaleString("en-US", {
        month: "long",
      });

    const selectedYear =
      Number(req.query.year) ||
      now.getFullYear();

    // =======================================================
    // BASIC COUNTS
    // =======================================================

    const [
      totalStudents,
      totalTeachers,
      totalResults,
    ] = await Promise.all([
      studentsCollection.countDocuments({}),
      teachersCollection.countDocuments({}),
      resultsCollection.countDocuments({}),
    ]);

    // =======================================================
    // SELECTED MONTH FEES
    // =======================================================

    const selectedFees = await feesCollection
      .find({
        month: selectedMonth,
        year: selectedYear,
      })
      .toArray();

    const totalIncome = selectedFees.reduce(
      (sum, fee) => {
        return sum + (Number(fee.paidAmount) || 0);
      },
      0
    );

    // =======================================================
    // SELECTED MONTH EXPENSES
    // =======================================================

    const selectedExpenses =
      await expensesCollection
        .find({
          month: selectedMonth,
          year: selectedYear,
        })
        .toArray();

    const totalExpenses =
      selectedExpenses.reduce(
        (sum, expense) => {
          return (
            sum +
            (Number(expense.amount) || 0)
          );
        },
        0
      );

    // =======================================================
    // PROFIT / LOSS
    // =======================================================

    const profitLoss =
      totalIncome - totalExpenses;

    const financialStatus =
      profitLoss >= 0
        ? "Profit"
        : "Loss";

    // =======================================================
    // YEARLY MONTHLY SUMMARY
    // =======================================================

    const yearFees =
      await feesCollection
        .find({
          year: selectedYear,
        })
        .toArray();

    const yearExpenses =
      await expensesCollection
        .find({
          year: selectedYear,
        })
        .toArray();

    // -------------------------------------------------------
    // MONTH LIST
    // -------------------------------------------------------

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthlySummary = months.map(
      (month) => {
        const monthIncome =
          yearFees.reduce(
            (sum, fee) => {
              if (
                String(fee.month).trim() ===
                month
              ) {
                return (
                  sum +
                  (Number(
                    fee.paidAmount
                  ) || 0)
                );
              }

              return sum;
            },
            0
          );

        const monthExpense =
          yearExpenses.reduce(
            (sum, expense) => {
              if (
                String(
                  expense.month
                ).trim() === month
              ) {
                return (
                  sum +
                  (Number(
                    expense.amount
                  ) || 0)
                );
              }

              return sum;
            },
            0
          );

        return {
          month,
          income: monthIncome,
          expenses: monthExpense,
          profitLoss:
            monthIncome -
            monthExpense,
        };
      }
    );

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      filters: {
        month: selectedMonth,
        year: selectedYear,
      },

      stats: {
        totalStudents,
        totalTeachers,
        totalResults,

        totalIncome,
        totalExpenses,

        profitLoss,
        financialStatus,
      },

      monthlySummary,
    });
  } catch (error) {
    console.error(
      "Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load dashboard data",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboard,
};

