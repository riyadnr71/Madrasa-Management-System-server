const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// =========================================================
// EXPENSE TYPES
// =========================================================

const EXPENSE_TYPES = [
  "Teacher Salary",
  "Electricity Bill",
  "Office Bill",
  "House Rent",
  "Other",
];

// =========================================================
// GENERATE EXPENSE ID
// =========================================================

const generateExpenseId = async (collection) => {
  const lastExpense = await collection
    .find({})
    .sort({ expenseId: -1 })
    .limit(1)
    .toArray();

  if (!lastExpense.length) {
    return "EXP-0001";
  }

  const lastId = lastExpense[0].expenseId || "EXP-0000";
  const lastNumber = parseInt(lastId.replace(/\D/g, ""), 10) || 0;

  return `EXP-${String(lastNumber + 1).padStart(4, "0")}`;
};

// =========================================================
// ADD EXPENSE
// =========================================================

const addExpense = async (req, res) => {
  try {
    const db = getDB();

    const expensesCollection = db.collection("expenses");
    const teachersCollection = db.collection("teachers");

    const {
      expenseType,
      title,
      month,
      year,
      expenseDate,
      amount,
      paymentMethod,
      note,
      teacherId,
    } = req.body;

    // -------------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------------

    if (!expenseType) {
      return res.status(400).json({
        success: false,
        message: "Expense type is required",
      });
    }

    if (!EXPENSE_TYPES.includes(expenseType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense type",
      });
    }

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!expenseDate) {
      return res.status(400).json({
        success: false,
        message: "Expense date is required",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // -------------------------------------------------------
    // OTHER TITLE
    // -------------------------------------------------------

    if (expenseType === "Other" && !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense title is required for Other",
      });
    }

    // -------------------------------------------------------
    // TEACHER SALARY
    // -------------------------------------------------------

    let teacherData = null;
    let finalAmount = Number(amount);
    let finalTitle = title?.trim() || expenseType;

    if (expenseType === "Teacher Salary") {
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Please select a teacher",
        });
      }

      teacherData = await teachersCollection.findOne({
        teacherId: String(teacherId).trim(),
      });

      if (!teacherData) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // Teacher-এর database salary automatically নেওয়া হবে
      finalAmount = Number(teacherData.salary) || 0;

      if (finalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Selected teacher has no valid salary",
        });
      }

      finalTitle = "Teacher Salary";

      // -----------------------------------------------------
      // DUPLICATE SALARY CHECK
      // একই teacher + একই month + year
      // -----------------------------------------------------

      const existingSalary = await expensesCollection.findOne({
        expenseType: "Teacher Salary",
        teacherId: teacherData.teacherId,
        month: String(month).trim(),
        year: Number(year),
      });

      if (existingSalary) {
        return res.status(409).json({
          success: false,
          message: `${teacherData.name} already has salary added for ${month} ${year}`,
        });
      }
    }

    // -------------------------------------------------------
    // EXPENSE ID
    // -------------------------------------------------------

    const expenseId = await generateExpenseId(expensesCollection);

    // -------------------------------------------------------
    // EXPENSE DOCUMENT
    // -------------------------------------------------------

    const expense = {
      expenseId,

      expenseType,

      title: finalTitle,

      month: String(month).trim(),

      year: Number(year),

      expenseDate,

      amount: finalAmount,

      paymentMethod: paymentMethod || "Cash",

      note: note?.trim() || "",

      teacherId:
        expenseType === "Teacher Salary"
          ? teacherData.teacherId
          : "",

      teacherName:
        expenseType === "Teacher Salary"
          ? teacherData.name
          : "",

      teacherDesignation:
        expenseType === "Teacher Salary"
          ? teacherData.designation || ""
          : "",

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const result = await expensesCollection.insertOne(expense);

    return res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: {
        ...expense,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Add Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add expense",
      error: error.message,
    });
  }
};

// =========================================================
// GET ALL EXPENSES
// =========================================================

const getExpenses = async (req, res) => {
  try {
    const db = getDB();

    const expensesCollection = db.collection("expenses");

    const expenses = await expensesCollection
      .find({})
      .sort({
        year: -1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      expenses,
    });
  } catch (error) {
    console.error("Get Expenses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
};

// =========================================================
// GET SINGLE EXPENSE
// =========================================================

const getExpenseById = async (req, res) => {
  try {
    const db = getDB();

    const expensesCollection = db.collection("expenses");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await expensesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Get Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
    });
  }
};

// =========================================================
// UPDATE EXPENSE
// =========================================================

const updateExpense = async (req, res) => {
  try {
    const db = getDB();

    const expensesCollection = db.collection("expenses");
    const teachersCollection = db.collection("teachers");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const existingExpense = await expensesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    const {
      expenseType,
      title,
      month,
      year,
      expenseDate,
      amount,
      paymentMethod,
      note,
      teacherId,
    } = req.body;

    if (!expenseType || !month || !year || !expenseDate) {
      return res.status(400).json({
        success: false,
        message: "Expense type, month, year and date are required",
      });
    }

    let finalAmount = Number(amount);
    let finalTitle = title?.trim() || expenseType;

    let finalTeacherId = "";
    let finalTeacherName = "";
    let finalTeacherDesignation = "";

    // -------------------------------------------------------
    // TEACHER SALARY UPDATE
    // -------------------------------------------------------

    if (expenseType === "Teacher Salary") {
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Please select a teacher",
        });
      }

      const teacher = await teachersCollection.findOne({
        teacherId: String(teacherId).trim(),
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      finalAmount = Number(teacher.salary) || 0;

      if (finalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Selected teacher has no valid salary",
        });
      }

      finalTitle = "Teacher Salary";

      finalTeacherId = teacher.teacherId;
      finalTeacherName = teacher.name;
      finalTeacherDesignation = teacher.designation || "";

      const duplicateSalary = await expensesCollection.findOne({
        _id: {
          $ne: new ObjectId(id),
        },
        expenseType: "Teacher Salary",
        teacherId: finalTeacherId,
        month: String(month).trim(),
        year: Number(year),
      });

      if (duplicateSalary) {
        return res.status(409).json({
          success: false,
          message: `${teacher.name} already has salary added for ${month} ${year}`,
        });
      }
    } else {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      if (expenseType === "Other" && !title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Expense title is required for Other",
        });
      }
    }

    const updatedExpense = {
      expenseType,

      title: finalTitle,

      month: String(month).trim(),

      year: Number(year),

      expenseDate,

      amount: finalAmount,

      paymentMethod: paymentMethod || "Cash",

      note: note?.trim() || "",

      teacherId: finalTeacherId,

      teacherName: finalTeacherName,

      teacherDesignation: finalTeacherDesignation,

      updatedAt: new Date(),
    };

    await expensesCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updatedExpense,
      }
    );

    const result = await expensesCollection.findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense: result,
    });
  } catch (error) {
    console.error("Update Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

// =========================================================
// DELETE EXPENSE
// =========================================================

const deleteExpense = async (req, res) => {
  try {
    const db = getDB();

    const expensesCollection = db.collection("expenses");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const result = await expensesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete expense",
    });
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};