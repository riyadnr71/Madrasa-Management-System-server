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

  const lastNumber =
    parseInt(lastId.replace(/\D/g, ""), 10) || 0;

  return `EXP-${String(lastNumber + 1).padStart(4, "0")}`;
};

// =========================================================
// GENERATE SALARY PAYMENT INVOICE NUMBER
// =========================================================

const generatePaymentInvoiceNumber = async (collection) => {
  const expenses = await collection
    .find({
      expenseType: "Teacher Salary",
      payments: {
        $exists: true,
        $ne: [],
      },
    })
    .toArray();

  let lastNumber = 0;

  for (const expense of expenses) {
    const payments = Array.isArray(expense.payments)
      ? expense.payments
      : [];

    for (const payment of payments) {
      const invoiceNumber = payment.invoiceNumber || "";

      const match = invoiceNumber.match(/(\d+)$/);

      if (match) {
        const number = parseInt(match[1], 10);

        if (number > lastNumber) {
          lastNumber = number;
        }
      }
    }
  }

  return `SAL-${String(lastNumber + 1).padStart(4, "0")}`;
};

// =========================================================
// PAYMENT STATUS
// =========================================================

const getPaymentStatus = (amount, paidAmount) => {
  const total = Number(amount || 0);
  const paid = Number(paidAmount || 0);

  if (paid <= 0) {
    return "Due";
  }

  if (paid >= total) {
    return "Paid";
  }

  return "Partial";
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
      paymentAmount,
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

    // -------------------------------------------------------
    // NORMAL EXPENSE AMOUNT VALIDATION
    // -------------------------------------------------------

    if (
      expenseType !== "Teacher Salary" &&
      (!amount || Number(amount) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // -------------------------------------------------------
    // OTHER EXPENSE TITLE
    // -------------------------------------------------------

    if (expenseType === "Other" && !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense title is required for Other",
      });
    }

    // -------------------------------------------------------
    // DEFAULT VALUES
    // -------------------------------------------------------

    let teacherData = null;

    let finalAmount = Number(amount) || 0;

    let finalTitle = title?.trim() || expenseType;

    let paidAmount = 0;

    let dueAmount = 0;

    let paymentStatus = "Paid";

    let payments = [];

    // =======================================================
    // TEACHER SALARY
    // =======================================================

    if (expenseType === "Teacher Salary") {
      // -----------------------------------------------------
      // TEACHER REQUIRED
      // -----------------------------------------------------

      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Please select a teacher",
        });
      }

      // -----------------------------------------------------
      // FIND TEACHER
      // -----------------------------------------------------

      teacherData = await teachersCollection.findOne({
        teacherId: String(teacherId).trim(),
      });

      if (!teacherData) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // -----------------------------------------------------
      // AUTO LOAD FULL SALARY
      // -----------------------------------------------------

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

      // -----------------------------------------------------
      // INITIAL PAYMENT
      // -----------------------------------------------------

      const initialPayment = Number(paymentAmount || 0);

      if (initialPayment < 0) {
        return res.status(400).json({
          success: false,
          message: "Payment amount cannot be negative",
        });
      }

      if (initialPayment > finalAmount) {
        return res.status(400).json({
          success: false,
          message: "Payment amount cannot be greater than salary",
        });
      }

      paidAmount = initialPayment;

      dueAmount = Math.max(
        finalAmount - paidAmount,
        0
      );

      paymentStatus = getPaymentStatus(
        finalAmount,
        paidAmount
      );

      // -----------------------------------------------------
      // FIRST PAYMENT HISTORY
      // -----------------------------------------------------

      if (initialPayment > 0) {
        const invoiceNumber =
          await generatePaymentInvoiceNumber(
            expensesCollection
          );

        payments.push({
          amount: initialPayment,

          date: expenseDate,

          paymentMethod: paymentMethod || "Cash",

          note: note?.trim() || "",

          invoiceNumber,

          createdAt: new Date(),
        });
      }
    }

    // =======================================================
    // NORMAL EXPENSE
    // =======================================================

    else {
      paidAmount = finalAmount;

      dueAmount = 0;

      paymentStatus = "Paid";
    }

    // =======================================================
    // GENERATE EXPENSE ID
    // =======================================================

    const expenseId =
      await generateExpenseId(
        expensesCollection
      );

    // =======================================================
    // EXPENSE DOCUMENT
    // =======================================================

    const expense = {
      expenseId,

      expenseType,

      title: finalTitle,

      month: String(month).trim(),

      year: Number(year),

      expenseDate,

      // Full expense / full salary
      amount: finalAmount,

      // Actually paid
      paidAmount,

      // Remaining amount
      dueAmount,

      // Due / Partial / Paid
      paymentStatus,

      // Payment history
      payments,

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

    // =======================================================
    // SAVE
    // =======================================================

    const result =
      await expensesCollection.insertOne(expense);

    return res.status(201).json({
      success: true,

      message:
        expenseType === "Teacher Salary"
          ? "Teacher salary added successfully"
          : "Expense added successfully",

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

    const expensesCollection =
      db.collection("expenses");

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

    const expensesCollection =
      db.collection("expenses");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense =
      await expensesCollection.findOne({
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

    const expensesCollection =
      db.collection("expenses");

    const teachersCollection =
      db.collection("teachers");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const existingExpense =
      await expensesCollection.findOne({
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

    if (
      !expenseType ||
      !month ||
      !year ||
      !expenseDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expense type, month, year and date are required",
      });
    }

    let finalAmount =
      Number(amount) || 0;

    let finalTitle =
      title?.trim() || expenseType;

    // =======================================================
    // TEACHER SALARY UPDATE
    // =======================================================

    if (expenseType === "Teacher Salary") {
      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Please select a teacher",
        });
      }

      const teacher =
        await teachersCollection.findOne({
          teacherId: String(teacherId).trim(),
        });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      finalAmount =
        Number(teacher.salary) || 0;

      if (finalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Selected teacher has no valid salary",
        });
      }

      finalTitle = "Teacher Salary";

      // -----------------------------------------------------
      // DUPLICATE CHECK
      // -----------------------------------------------------

      const duplicateSalary =
        await expensesCollection.findOne({
          _id: {
            $ne: new ObjectId(id),
          },

          expenseType: "Teacher Salary",

          teacherId: teacher.teacherId,

          month: String(month).trim(),

          year: Number(year),
        });

      if (duplicateSalary) {
        return res.status(409).json({
          success: false,
          message: `${teacher.name} already has salary added for ${month} ${year}`,
        });
      }

      // -----------------------------------------------------
      // KEEP EXISTING PAYMENT HISTORY
      // -----------------------------------------------------

      const existingPayments =
        Array.isArray(existingExpense.payments)
          ? existingExpense.payments
          : [];

      let paidAmount = 0;

      if (existingPayments.length > 0) {
        paidAmount =
          existingPayments.reduce(
            (sum, payment) =>
              sum + Number(payment.amount || 0),
            0
          );
      } else if (
        existingExpense.paidAmount !== undefined
      ) {
        paidAmount =
          Number(existingExpense.paidAmount) || 0;
      } else {
        // Old salary records were treated as fully paid
        paidAmount =
          Number(existingExpense.amount) || 0;
      }

      const dueAmount = Math.max(
        finalAmount - paidAmount,
        0
      );

      const paymentStatus =
        getPaymentStatus(
          finalAmount,
          paidAmount
        );

      const updatedExpense = {
        expenseType,

        title: finalTitle,

        month: String(month).trim(),

        year: Number(year),

        expenseDate,

        amount: finalAmount,

        paidAmount,

        dueAmount,

        paymentStatus,

        payments: existingPayments,

        paymentMethod:
          paymentMethod ||
          existingExpense.paymentMethod ||
          "Cash",

        note:
          note?.trim() ||
          existingExpense.note ||
          "",

        teacherId: teacher.teacherId,

        teacherName: teacher.name,

        teacherDesignation:
          teacher.designation || "",

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

      const result =
        await expensesCollection.findOne({
          _id: new ObjectId(id),
        });

      return res.status(200).json({
        success: true,
        message: "Expense updated successfully",
        expense: result,
      });
    }

    // =======================================================
    // NORMAL EXPENSE UPDATE
    // =======================================================

    if (
      !amount ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (
      expenseType === "Other" &&
      !title?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expense title is required for Other",
      });
    }

    const updatedExpense = {
      expenseType,

      title: finalTitle,

      month: String(month).trim(),

      year: Number(year),

      expenseDate,

      amount: finalAmount,

      paidAmount: finalAmount,

      dueAmount: 0,

      paymentStatus: "Paid",

      paymentMethod:
        paymentMethod || "Cash",

      note: note?.trim() || "",

      teacherId: "",

      teacherName: "",

      teacherDesignation: "",

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

    const result =
      await expensesCollection.findOne({
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
// ADD SALARY PAYMENT
// =========================================================

const addSalaryPayment = async (req, res) => {
  try {
    const db = getDB();

    const expensesCollection =
      db.collection("expenses");

    const { id } = req.params;

    const {
      amount,
      paymentMethod,
      note,
      paymentDate,
    } = req.body;

    // -------------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------------

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    // -------------------------------------------------------
    // FIND EXPENSE
    // -------------------------------------------------------

    const expense =
      await expensesCollection.findOne({
        _id: new ObjectId(id),
      });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // -------------------------------------------------------
    // ONLY TEACHER SALARY
    // -------------------------------------------------------

    if (
      expense.expenseType !==
      "Teacher Salary"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment can only be added to teacher salary",
      });
    }

    // -------------------------------------------------------
    // PAYMENT AMOUNT
    // -------------------------------------------------------

    const paymentAmount =
      Number(amount);

    if (
      !paymentAmount ||
      paymentAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid payment amount is required",
      });
    }

    // -------------------------------------------------------
    // EXISTING PAYMENTS
    // -------------------------------------------------------

    const existingPayments =
      Array.isArray(expense.payments)
        ? expense.payments
        : [];

    // -------------------------------------------------------
    // CURRENT PAID
    // -------------------------------------------------------

    let currentPaid =
      existingPayments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.amount || 0),
        0
      );

    // -------------------------------------------------------
    // BACKWARD COMPATIBILITY
    // -------------------------------------------------------

    if (
      !existingPayments.length &&
      Number(expense.paidAmount || 0) > 0
    ) {
      currentPaid =
        Number(expense.paidAmount || 0);
    }

    const totalAmount =
      Number(expense.amount || 0);

    const currentDue = Math.max(
      totalAmount - currentPaid,
      0
    );

    // -------------------------------------------------------
    // ALREADY FULLY PAID
    // -------------------------------------------------------

    if (currentDue <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "This salary is already fully paid",
      });
    }

    // -------------------------------------------------------
    // DON'T ALLOW OVERPAYMENT
    // -------------------------------------------------------

    if (paymentAmount > currentDue) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum payment allowed is ৳${currentDue.toLocaleString()}`,
      });
    }

    // -------------------------------------------------------
    // GENERATE INVOICE
    // -------------------------------------------------------

    const invoiceNumber =
      await generatePaymentInvoiceNumber(
        expensesCollection
      );

    // -------------------------------------------------------
    // NEW PAYMENT
    // -------------------------------------------------------

    const newPayment = {
      amount: paymentAmount,

      date:
        paymentDate ||
        new Date().toISOString(),

      paymentMethod:
        paymentMethod || "Cash",

      note:
        note?.trim() || "",

      invoiceNumber,

      createdAt: new Date(),
    };

    // -------------------------------------------------------
    // NEW TOTALS
    // -------------------------------------------------------

    const newPaid =
      currentPaid + paymentAmount;

    const newDue = Math.max(
      totalAmount - newPaid,
      0
    );

    const newStatus =
      getPaymentStatus(
        totalAmount,
        newPaid
      );

    // -------------------------------------------------------
    // UPDATE DATABASE
    // -------------------------------------------------------

    await expensesCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          paidAmount: newPaid,

          dueAmount: newDue,

          paymentStatus: newStatus,

          payments: [
            ...existingPayments,
            newPayment,
          ],

          paymentMethod:
            paymentMethod || "Cash",

          updatedAt: new Date(),
        },
      }
    );

    // -------------------------------------------------------
    // UPDATED EXPENSE
    // -------------------------------------------------------

    const updatedExpense =
      await expensesCollection.findOne({
        _id: new ObjectId(id),
      });

    return res.status(200).json({
      success: true,

      message:
        "Salary payment added successfully",

      expense: updatedExpense,

      payment: newPayment,
    });
  } catch (error) {
    console.error(
      "Add Salary Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add salary payment",

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

    const expensesCollection =
      db.collection("expenses");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const result =
      await expensesCollection.deleteOne({
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
      message:
        "Expense deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Expense Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete expense",
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
  addSalaryPayment,
  deleteExpense,
};