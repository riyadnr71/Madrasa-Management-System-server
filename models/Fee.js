const FeeModel = {
  studentId: null,

  studentName: "",
  studentIdCard: "",
  roll: "",
  className: "",
  session: "",

  month: "",
  year: 0,

  monthlyFee: 0,
  examFee: 0,
  total: 0,

  paidAmount: 0,
  dueAmount: 0,

  paymentStatus: "Due",

  payments: [
    {
      amount: 0,
      date: "",
      invoiceNumber: "",
    },
  ],

  createdAt: new Date(),
  updatedAt: new Date(),
};

module.exports = FeeModel;