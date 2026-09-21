const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addFee,
  getFees,
  getFeeById,
  addPayment,
  updateFee,
  deleteFee,
} = require("../controllers/feeController");

/* =========================================================
   GET ALL FEES
========================================================= */

router.get(
  "/",
  authMiddleware,
  getFees
);

/* =========================================================
   GET SINGLE FEE
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  getFeeById
);

/* =========================================================
   ADD FEE
========================================================= */

router.post(
  "/",
  authMiddleware,
  addFee
);

/* =========================================================
   ADD PAYMENT
========================================================= */

router.post(
  "/:id/payment",
  authMiddleware,
  addPayment
);

/* =========================================================
   UPDATE FEE
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  updateFee
);

/* =========================================================
   DELETE FEE
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  deleteFee
);

module.exports = router;