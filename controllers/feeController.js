const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

/* =========================================================
   COLLECTION
========================================================= */

const getCollection = () => {
  return getDB().collection("fees");
};

const getStudentCollection = () => {
  return getDB().collection("students");
};

/* =========================================================
   GENERATE INVOICE NUMBER
========================================================= */

const generateInvoiceNumber = () => {
  const number = Math.floor(100 + Math.random() * 900);

  return `#${number}`;
};

/* =========================================================
   PAYMENT DATE
========================================================= */

const getPaymentDate = (date) => {
  if (date) {
    return date;
  }

  return new Date().toISOString().split("T")[0];
};

/* =========================================================
   PAYMENT STATUS
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
   Supports OLD records
========================================================= */

const getPayments = (fee) => {
  /* -------------------------------------------------------
     New records
  ------------------------------------------------------- */

  if (Array.isArray(fee.payments)) {
    return fee.payments;
  }

  /* -------------------------------------------------------
     Old records
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
      invoiceNumber: requestedInvoiceNumber,
    } = req.body;

    /* -------------------------------------------------------
       REQUIRED VALIDATION
    ------------------------------------------------------- */

    if (
      !studentId ||
      !className ||
      !month ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student, class, month and year are required.",
      });
    }

    /* -------------------------------------------------------
       FIND STUDENT
    ------------------------------------------------------- */

    let student = null;

    /* MongoDB ObjectId */
    if (ObjectId.isValid(studentId)) {
      student =
        await getStudentCollection().findOne({
          _id: new ObjectId(studentId),
        });
    }

    /* Fallback: Student ID / ID Card */
    if (!student) {
      student =
        await getStudentCollection().findOne({
          idCard: String(studentId).trim(),
        });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    /* -------------------------------------------------------
       FINAL STUDENT DATA
       Prefer database data
    ------------------------------------------------------- */

    const finalStudentId =
      student._id.toString();

    const finalStudentName =
      student.name ||
      studentName ||
      "";

    const finalStudentIdCard =
      student.idCard ||
      studentIdCard ||
      "";

    const finalRoll =
      student.roll ||
      roll ||
      "";

    const finalClassName =
      student.className ||
      className ||
      "";

    const finalSession =
      student.session ||
      student.academicSession ||
      session ||
      "";

    /* -------------------------------------------------------
       NUMBER CONVERSION
    ------------------------------------------------------- */

    const monthly =
      Number(monthlyFee) || 0;

    const exam =
      Number(examFee) || 0;

    const paid =
      Number(paidAmount) || 0;

    const numericYear =
      Number(year);

    /* -------------------------------------------------------
       YEAR VALIDATION
    ------------------------------------------------------- */

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year.",
      });
    }

    /* -------------------------------------------------------
       TOTAL
    ------------------------------------------------------- */

    const total =
      monthly + exam;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Total fee must be greater than 0.",
      });
    }

    /* -------------------------------------------------------
       PAID VALIDATION
    ------------------------------------------------------- */

    if (paid < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be negative.",
      });
    }

    if (paid > total) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be greater than total fee.",
      });
    }

    /* -------------------------------------------------------
       DUPLICATE CHECK

       Same student + month + year
    ------------------------------------------------------- */

    const existingFee =
      await getCollection().findOne({
        studentId: finalStudentId,

        month: String(month).trim(),

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
       DUE
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
       INVOICE
    ------------------------------------------------------- */

    const invoiceNumber =
      requestedInvoiceNumber ||
      generateInvoiceNumber();

    /* -------------------------------------------------------
       PAYMENT DATE
    ------------------------------------------------------- */

    const finalPaymentDate =
      paid > 0
        ? getPaymentDate(paymentDate)
        : "";

    /* -------------------------------------------------------
       PAYMENT HISTORY
    ------------------------------------------------------- */

    const payments =
      paid > 0
        ? [
            {
              amount: paid,

              date:
                finalPaymentDate,

              invoiceNumber,
            },
          ]
        : [];

    /* -------------------------------------------------------
       FEE DATA
    ------------------------------------------------------- */

    const feeData = {
      studentId:
        finalStudentId,

      studentName:
        finalStudentName,

      studentIdCard:
        finalStudentIdCard,

      roll:
        finalRoll,

      className:
        finalClassName,

      session:
        finalSession,

      month:
        String(month).trim(),

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

      invoiceNumber,

      paymentDate:
        finalPaymentDate,

      payments,

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    /* -------------------------------------------------------
       INSERT
    ------------------------------------------------------- */

    const result =
      await getCollection().insertOne(
        feeData
      );

    /* -------------------------------------------------------
       SAVED FEE
    ------------------------------------------------------- */

    const savedFee = {
      _id:
        result.insertedId,

      ...feeData,
    };

    /* -------------------------------------------------------
       PAYMENT RESPONSE
    ------------------------------------------------------- */

    const payment =
      paid > 0
        ? {
            amount: paid,

            date:
              finalPaymentDate,

            invoiceNumber,
          }
        : null;

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return res.status(201).json({
      success: true,

      message:
        "Fee collected successfully.",

      fee:
        savedFee,

      payment,

      invoice:
        payment,
    });
  } catch (error) {
    console.error(
      "Add Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to collect fee.",
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

    const normalizedFees =
      fees.map((fee) => ({
        ...fee,

        payments:
          getPayments(fee),
      }));

    return res.status(200).json({
      success: true,

      fees:
        normalizedFees,
    });
  } catch (error) {
    console.error(
      "Get Fees Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load fees.",
    });
  }
};

/* =========================================================
   GET SINGLE FEE
========================================================= */

const getFeeById = async (req, res) => {
  try {
    const { id } =
      req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID.",
      });
    }

    const fee =
      await getCollection().findOne({
        _id:
          new ObjectId(id),
      });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found.",
      });
    }

    const normalizedFee = {
      ...fee,

      payments:
        getPayments(fee),
    };

    return res.status(200).json({
      success: true,

      fee:
        normalizedFee,
    });
  } catch (error) {
    console.error(
      "Get Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load fee.",
    });
  }
};

/* =========================================================
   ADD PAYMENT
========================================================= */

const addPayment = async (req, res) => {
  try {
    const { id } =
      req.params;

    const {
      amount,
      paymentDate,
      paymentMethod,
      note,
    } = req.body;

    /* -------------------------------------------------------
       ID VALIDATION
    ------------------------------------------------------- */

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID.",
      });
    }

    /* -------------------------------------------------------
       AMOUNT
    ------------------------------------------------------- */

    const paymentAmount =
      Number(amount) || 0;

    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount must be greater than 0.",
      });
    }

    /* -------------------------------------------------------
       FIND FEE
    ------------------------------------------------------- */

    const fee =
      await getCollection().findOne({
        _id:
          new ObjectId(id),
      });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found.",
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
       FULLY PAID
    ------------------------------------------------------- */

    if (currentDue <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "This fee is already fully paid.",
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
          `Maximum payable amount is ${currentDue}.`,
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
       INVOICE
    ------------------------------------------------------- */

    const invoiceNumber =
      generateInvoiceNumber();

    const finalPaymentDate =
      getPaymentDate(
        paymentDate
      );

    /* -------------------------------------------------------
       NEW PAYMENT
    ------------------------------------------------------- */

    const newPayment = {
      amount:
        paymentAmount,

      date:
        finalPaymentDate,

      invoiceNumber,

      paymentMethod:
        paymentMethod || "Cash",

      note:
        note || "",
    };

    /* -------------------------------------------------------
       EXISTING HISTORY
    ------------------------------------------------------- */

    let payments =
      getPayments(fee);

    if (!Array.isArray(payments)) {
      payments = [];
    }

    payments = [
      ...payments,
      newPayment,
    ];

    /* -------------------------------------------------------
       UPDATE
    ------------------------------------------------------- */

    await getCollection().updateOne(
      {
        _id:
          new ObjectId(id),
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
            finalPaymentDate,

          invoiceNumber,

          payments,

          updatedAt:
            new Date(),
        },
      }
    );

    /* -------------------------------------------------------
       UPDATED FEE
    ------------------------------------------------------- */

    const updatedFee =
      await getCollection().findOne({
        _id:
          new ObjectId(id),
      });

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Payment added successfully.",

      fee:
        updatedFee,

      payment:
        newPayment,

      invoice: {
        invoiceNumber,

        amount:
          paymentAmount,

        date:
          finalPaymentDate,
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
        "Failed to add payment.",
    });
  }
};

/* =========================================================
   UPDATE FEE
========================================================= */

const updateFee = async (req, res) => {
  try {
    const { id } =
      req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID.",
      });
    }

    const {
      month,
      year,
      monthlyFee,
      examFee,
    } = req.body;

    const monthly =
      Number(monthlyFee) || 0;

    const exam =
      Number(examFee) || 0;

    const numericYear =
      Number(year);

    const total =
      monthly + exam;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Total fee must be greater than 0.",
      });
    }

    const existingFee =
      await getCollection().findOne({
        _id:
          new ObjectId(id),
      });

    if (!existingFee) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found.",
      });
    }

    const paid =
      Number(
        existingFee.paidAmount
      ) || 0;

    if (paid > total) {
      return res.status(400).json({
        success: false,

        message:
          `Total fee cannot be less than already paid amount (${paid}).`,
      });
    }

    const due =
      Math.max(
        total - paid,
        0
      );

    const paymentStatus =
      getPaymentStatus(
        paid,
        total
      );

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

    const result =
      await getCollection().updateOne(
        {
          _id:
            new ObjectId(id),
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
          "Fee record not found.",
      });
    }

    const updatedFee =
      await getCollection().findOne({
        _id:
          new ObjectId(id),
      });

    const normalizedFee = {
      ...updatedFee,

      payments:
        getPayments(updatedFee),
    };

    return res.status(200).json({
      success: true,

      message:
        "Fee updated successfully.",

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
        "Failed to update fee.",
    });
  }
};

/* =========================================================
   DELETE FEE
========================================================= */

const deleteFee = async (req, res) => {
  try {
    const { id } =
      req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fee ID.",
      });
    }

    const result =
      await getCollection().deleteOne({
        _id:
          new ObjectId(id),
      });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message:
          "Fee record not found.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Fee deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete Fee Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete fee.",
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