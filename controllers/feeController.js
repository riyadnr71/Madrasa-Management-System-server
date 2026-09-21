const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const getCollection = () => {
  return getDB().collection("fees");
};

/* =========================================================
   GENERATE INVOICE NUMBER
========================================================= */

const generateInvoiceNumber = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${year}${month}${day}-${random}`;
};

/* =========================================================
   GET PAYMENT DATE
========================================================= */

const getPaymentDate = (date) => {
  if (date) {
    return date;
  }

  return new Date().toISOString().split("T")[0];
};

/* =========================================================
   GET PAYMENT STATUS
========================================================= */

const getPaymentStatus = (paid, total) => {
  if (paid >= total && total > 0) {
    return "Paid";
  }

  if (paid > 0) {
    return "Partial";
  }

  return "Due";
};

/* =========================================================
   NORMALIZE PAYMENT HISTORY
   Supports OLD fee records
========================================================= */

const getPayments = (fee) => {
  /* -------------------------------------------------------
     New records already have payments[]
  ------------------------------------------------------- */

  if (Array.isArray(fee.payments)) {
    return fee.payments;
  }

  /* -------------------------------------------------------
     OLD records may only have:
     paidAmount
     paymentDate
     invoiceNumber
  ------------------------------------------------------- */

  const paidAmount = Number(fee.paidAmount) || 0;

  if (paidAmount <= 0) {
    return [];
  }

  return [
    {
      amount: paidAmount,

      date:
        fee.paymentDate ||
        fee.createdAt ||
        new Date(),

      invoiceNumber:
        fee.invoiceNumber ||
        "LEGACY",
    },
  ];
};

/* =========================================================
   ADD FEE
========================================================= */

const addFee = async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentIdCard,
      roll,
      className,
      session,
      month,
      year,
      monthlyFee,
      examFee,
      paidAmount,
      paymentDate,
    } = req.body;

    /* -------------------------------------------------------
       REQUIRED VALIDATION
    ------------------------------------------------------- */

    if (
      !studentId ||
      !studentName ||
      !className ||
      !month ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student, class, month and year are required",
      });
    }

    /* -------------------------------------------------------
       NUMBER CONVERSION
    ------------------------------------------------------- */

    const monthly = Number(monthlyFee) || 0;
    const exam = Number(examFee) || 0;
    const paid = Number(paidAmount) || 0;

    const numericYear = Number(year);

    /* -------------------------------------------------------
       TOTAL
    ------------------------------------------------------- */

    const total = monthly + exam;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Total fee must be greater than 0",
      });
    }

    /* -------------------------------------------------------
       PAID VALIDATION
    ------------------------------------------------------- */

    if (paid < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be negative",
      });
    }

    if (paid > total) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be greater than total fee",
      });
    }

    /* -------------------------------------------------------
       DUPLICATE CHECK

       Same student + same month + same year
    ------------------------------------------------------- */

    const existingFee =
      await getCollection().findOne({
        studentId,
        month,
        year: numericYear,
      });

    if (existingFee) {
      return res.status(409).json({
        success: false,
        message:
          "Fee for this month already exists. Use Add Payment.",
      });
    }

    /* -------------------------------------------------------
       CALCULATE DUE
    ------------------------------------------------------- */

    const due = Math.max(
      total - paid,
      0
    );

    /* -------------------------------------------------------
       PAYMENT STATUS
    ------------------------------------------------------- */

    const paymentStatus =
      getPaymentStatus(
        paid,
        total
      );

    /* -------------------------------------------------------
       GENERATE INVOICE
    ------------------------------------------------------- */

    const invoiceNumber =
      generateInvoiceNumber();

    /* -------------------------------------------------------
       PAYMENT HISTORY
    ------------------------------------------------------- */

    const payments =
      paid > 0
        ? [
            {
              amount: paid,

              date:
                getPaymentDate(
                  paymentDate
                ),

              invoiceNumber,
            },
          ]
        : [];

    /* -------------------------------------------------------
       FEE DATA
    ------------------------------------------------------- */

    const feeData = {
      studentId,
      studentName,

      studentIdCard:
        studentIdCard || "",

      roll:
        roll || "",

      className,

      session:
        session || "",

      month,

      year: numericYear,

      monthlyFee: monthly,

      examFee: exam,

      total,

      paidAmount: paid,

      dueAmount: due,

      paymentStatus,

      /* Latest invoice */
      invoiceNumber,

      /* Payment date */
      paymentDate:
        paid > 0
          ? getPaymentDate(paymentDate)
          : "",

      /* Full payment history */
      payments,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    /* -------------------------------------------------------
       INSERT
    ------------------------------------------------------- */

    const result =
      await getCollection().insertOne(
        feeData
      );

    const savedFee = {
      _id: result.insertedId,
      ...feeData,
    };

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return res.status(201).json({
      success: true,

      message:
        "Fee collected successfully",

      fee: savedFee,

      /* Immediate invoice */
      invoice:
        paid > 0
          ? {
              invoiceNumber,

              amount: paid,

              date:
                getPaymentDate(
                  paymentDate
                ),
            }
          : null,
    });
  } catch (error) {
    console.error(
      "Add Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to collect fee",
    });
  }
};

/* =========================================================
   GET ALL FEES
========================================================= */

const getFees = async (req, res) => {
  try {
    const fees =
      await getCollection()
        .find({})
        .sort({
          createdAt: -1,
        })
        .toArray();

    /* -------------------------------------------------------
       Normalize old records
    ------------------------------------------------------- */

    const normalizedFees =
      fees.map((fee) => {
        return {
          ...fee,

          payments:
            getPayments(fee),
        };
      });

    return res.status(200).json({
      success: true,

      fees: normalizedFees,
    });
  } catch (error) {
    console.error(
      "Get Fees Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load fees",
    });
  }
};

/* =========================================================
   GET SINGLE FEE
========================================================= */

const getFeeById = async (req, res) => {
  try {
    const { id } = req.params;

    /* -------------------------------------------------------
       ID VALIDATION
    ------------------------------------------------------- */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID",
      });
    }

    /* -------------------------------------------------------
       FIND FEE
    ------------------------------------------------------- */

    const fee =
      await getCollection().findOne({
        _id: new ObjectId(id),
      });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found",
      });
    }

    /* -------------------------------------------------------
       NORMALIZE PAYMENT HISTORY
    ------------------------------------------------------- */

    const normalizedFee = {
      ...fee,

      payments:
        getPayments(fee),
    };

    return res.status(200).json({
      success: true,

      fee: normalizedFee,
    });
  } catch (error) {
    console.error(
      "Get Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load fee",
    });
  }
};

/* =========================================================
   ADD PAYMENT
========================================================= */

const addPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      amount,
      paymentDate,
    } = req.body;

    /* -------------------------------------------------------
       ID VALIDATION
    ------------------------------------------------------- */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID",
      });
    }

    /* -------------------------------------------------------
       PAYMENT AMOUNT
    ------------------------------------------------------- */

    const paymentAmount =
      Number(amount) || 0;

    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount must be greater than 0",
      });
    }

    /* -------------------------------------------------------
       FIND FEE
    ------------------------------------------------------- */

    const fee =
      await getCollection().findOne({
        _id: new ObjectId(id),
      });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found",
      });
    }

    /* -------------------------------------------------------
       CURRENT VALUES
    ------------------------------------------------------- */

    const total =
      Number(fee.total) || 0;

    const currentPaid =
      Number(fee.paidAmount) || 0;

    const currentDue =
      Math.max(
        total - currentPaid,
        0
      );

    /* -------------------------------------------------------
       ALREADY PAID
    ------------------------------------------------------- */

    if (currentDue <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "This fee is already fully paid",
      });
    }

    /* -------------------------------------------------------
       PAYMENT CANNOT EXCEED DUE
    ------------------------------------------------------- */

    if (
      paymentAmount >
      currentDue
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum payable amount is ${currentDue}`,
      });
    }

    /* -------------------------------------------------------
       NEW VALUES
    ------------------------------------------------------- */

    const newPaid =
      currentPaid +
      paymentAmount;

    const newDue =
      Math.max(
        total - newPaid,
        0
      );

    const newStatus =
      getPaymentStatus(
        newPaid,
        total
      );

    /* -------------------------------------------------------
       NEW INVOICE
    ------------------------------------------------------- */

    const invoiceNumber =
      generateInvoiceNumber();

    const newPayment = {
      amount:
        paymentAmount,

      date:
        getPaymentDate(
          paymentDate
        ),

      invoiceNumber,
    };

    /* -------------------------------------------------------
       EXISTING PAYMENT HISTORY
    ------------------------------------------------------- */

    let payments =
      getPayments(fee);

    /* -------------------------------------------------------
       ADD NEW PAYMENT
    ------------------------------------------------------- */

    payments = [
      ...payments,
      newPayment,
    ];

    /* -------------------------------------------------------
       UPDATE DATABASE
    ------------------------------------------------------- */

    await getCollection().updateOne(
      {
        _id: new ObjectId(id),
      },

      {
        $set: {
          paidAmount:
            newPaid,

          dueAmount:
            newDue,

          paymentStatus:
            newStatus,

          paymentDate:
            getPaymentDate(
              paymentDate
            ),

          /* Latest invoice */
          invoiceNumber,

          /* Full history */
          payments,

          updatedAt:
            new Date(),
        },
      }
    );

    /* -------------------------------------------------------
       GET UPDATED FEE
    ------------------------------------------------------- */

    const updatedFee =
      await getCollection().findOne({
        _id: new ObjectId(id),
      });

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Payment added successfully",

      fee: updatedFee,

      invoice: {
        invoiceNumber,

        amount:
          paymentAmount,

        date:
          getPaymentDate(
            paymentDate
          ),
      },
    });
  } catch (error) {
    console.error(
      "Add Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add payment",
    });
  }
};

/* =========================================================
   UPDATE FEE
========================================================= */

const updateFee = async (req, res) => {
  try {
    const { id } = req.params;

    /* -------------------------------------------------------
       ID VALIDATION
    ------------------------------------------------------- */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID",
      });
    }

    const {
      month,
      year,
      monthlyFee,
      examFee,
    } = req.body;

    /* -------------------------------------------------------
       NUMBER CONVERSION
    ------------------------------------------------------- */

    const monthly =
      Number(monthlyFee) || 0;

    const exam =
      Number(examFee) || 0;

    const numericYear =
      Number(year);

    /* -------------------------------------------------------
       TOTAL
    ------------------------------------------------------- */

    const total =
      monthly + exam;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Total fee must be greater than 0",
      });
    }

    /* -------------------------------------------------------
       FIND EXISTING FEE
    ------------------------------------------------------- */

    const existingFee =
      await getCollection().findOne({
        _id: new ObjectId(id),
      });

    if (!existingFee) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found",
      });
    }

    /* -------------------------------------------------------
       KEEP EXISTING PAYMENT
    ------------------------------------------------------- */

    const paid =
      Number(
        existingFee.paidAmount
      ) || 0;

    /* -------------------------------------------------------
       DON'T ALLOW TOTAL < PAID
    ------------------------------------------------------- */

    if (paid > total) {
      return res.status(400).json({
        success: false,

        message:
          `Total fee cannot be less than already paid amount (${paid})`,
      });
    }

    /* -------------------------------------------------------
       CALCULATE DUE
    ------------------------------------------------------- */

    const due =
      Math.max(
        total - paid,
        0
      );

    /* -------------------------------------------------------
       STATUS
    ------------------------------------------------------- */

    const paymentStatus =
      getPaymentStatus(
        paid,
        total
      );

    /* -------------------------------------------------------
       UPDATE DATA

       IMPORTANT:
       Payment history is NOT destroyed.
    ------------------------------------------------------- */

    const updateData = {
      month,

      year:
        numericYear,

      monthlyFee:
        monthly,

      examFee:
        exam,

      total,

      paidAmount:
        paid,

      dueAmount:
        due,

      paymentStatus,

      updatedAt:
        new Date(),
    };

    /* -------------------------------------------------------
       UPDATE
    ------------------------------------------------------- */

    const result =
      await getCollection().updateOne(
        {
          _id: new ObjectId(id),
        },

        {
          $set:
            updateData,
        }
      );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found",
      });
    }

    /* -------------------------------------------------------
       GET UPDATED FEE
    ------------------------------------------------------- */

    const updatedFee =
      await getCollection().findOne({
        _id: new ObjectId(id),
      });

    const normalizedFee = {
      ...updatedFee,

      payments:
        getPayments(
          updatedFee
        ),
    };

    return res.status(200).json({
      success: true,

      message:
        "Fee updated successfully",

      fee:
        normalizedFee,
    });
  } catch (error) {
    console.error(
      "Update Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update fee",
    });
  }
};

/* =========================================================
   DELETE FEE
========================================================= */

const deleteFee = async (req, res) => {
  try {
    const { id } = req.params;

    /* -------------------------------------------------------
       ID VALIDATION
    ------------------------------------------------------- */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID",
      });
    }

    /* -------------------------------------------------------
       DELETE
    ------------------------------------------------------- */

    const result =
      await getCollection().deleteOne({
        _id: new ObjectId(id),
      });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Fee deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete fee",
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  addFee,
  getFees,
  getFeeById,
  addPayment,
  updateFee,
  deleteFee,
};