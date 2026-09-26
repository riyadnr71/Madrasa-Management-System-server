const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  addSalaryPayment,
  deleteExpense,
} = require("../controllers/expenseController");

// =========================================================
// GET ALL EXPENSES
// =========================================================

router.get(
  "/",
  authMiddleware,
  getExpenses
);

// =========================================================
// GET SINGLE EXPENSE
// =========================================================

router.get(
  "/:id",
  authMiddleware,
  getExpenseById
);

// =========================================================
// ADD EXPENSE
// =========================================================

router.post(
  "/",
  authMiddleware,
  addExpense
);

// =========================================================
// ADD SALARY PAYMENT
// =========================================================

router.post(
  "/:id/payment",
  authMiddleware,
  addSalaryPayment
);

// =========================================================
// UPDATE EXPENSE
// =========================================================

router.put(
  "/:id",
  authMiddleware,
  updateExpense
);

// =========================================================
// DELETE EXPENSE
// =========================================================

router.delete(
  "/:id",
  authMiddleware,
  deleteExpense
);

module.exports = router;