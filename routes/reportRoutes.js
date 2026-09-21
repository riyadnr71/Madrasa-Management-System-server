const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getResultReport,
  getFeeReport,
  getExpenseReport,
  getFinancialReport,
} = require("../controllers/reportController");

// Result Report
router.get("/results", authMiddleware, getResultReport);

// Fee Report
router.get("/fees", authMiddleware, getFeeReport);

// Expense Report
router.get("/expenses", authMiddleware, getExpenseReport);

// Financial Report
router.get("/financial", authMiddleware, getFinancialReport);

module.exports = router;