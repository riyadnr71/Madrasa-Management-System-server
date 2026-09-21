const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

// Get all expenses
router.get("/", authMiddleware, getExpenses);

// Get single expense
router.get("/:id", authMiddleware, getExpenseById);

// Add expense
router.post("/", authMiddleware, addExpense);

// Update expense
router.put("/:id", authMiddleware, updateExpense);

// Delete expense
router.delete("/:id", authMiddleware, deleteExpense);

module.exports = router;