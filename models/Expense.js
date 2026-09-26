const ExpenseModel = {
  // Expense basic info
  expenseId: "",

  expenseType: "",

  title: "",

  // Full expense / full salary
  amount: 0,

  // Total amount actually paid
  paidAmount: 0,

  // Remaining amount
  dueAmount: 0,

  // Due / Partial / Paid
  paymentStatus: "Paid",

  // Payment history
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

  // Teacher information
  teacherId: "",

  teacherName: "",

  teacherDesignation: "",

  // Salary / expense period
  month: "",

  year: 0,

  // Payment/expense date
  expenseDate: "",

  createdAt: new Date(),

  updatedAt: new Date(),
};

module.exports = ExpenseModel;