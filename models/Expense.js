const ExpenseModel = {
  // =========================================================
  // EXPENSE BASIC INFO
  // =========================================================

  expenseId: "",

  expenseType: "",

  title: "",

  // =========================================================
  // AMOUNT
  // =========================================================

  // Full expense / full salary
  amount: 0,

  // Total amount actually paid
  paidAmount: 0,

  // Remaining amount
  dueAmount: 0,

  // Due / Partial / Paid
  paymentStatus: "Paid",

  // =========================================================
  // PAYMENT HISTORY
  // =========================================================

  payments: [
    {
      amount: 0,

      date: "",

      paymentMethod: "Cash",

      note: "",

      invoiceNumber: "",

      createdAt: new Date(),
    },
  ],

  // Latest payment method
  paymentMethod: "Cash",

  note: "",

  // =========================================================
  // TEACHER INFORMATION
  // =========================================================

  teacherId: "",

  teacherName: "",

  teacherDesignation: "",

  // Teacher Branch
  teacherBranch: "",

  // =========================================================
  // SALARY / EXPENSE PERIOD
  // =========================================================

  month: "",

  year: 0,

  // =========================================================
  // PAYMENT / EXPENSE DATE
  // =========================================================

  expenseDate: "",

  // =========================================================
  // TIMESTAMPS
  // =========================================================

  createdAt: new Date(),

  updatedAt: new Date(),
};

module.exports = ExpenseModel;