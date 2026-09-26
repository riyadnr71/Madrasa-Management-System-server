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
   GET /api/fees
========================================================= */

router.get(
  "/",
  authMiddleware,
  getFees
);

/* =========================================================
   ADD FEE
   POST /api/fees
========================================================= */

router.post(
  "/",
  authMiddleware,
  addFee
);

/* =========================================================
   ADD PAYMENT
   POST /api/fees/:id/payment
========================================================= */

router.post(
  "/:id/payment",
  authMiddleware,
  addPayment
);

/* =========================================================
   UPDATE FEE
   PUT /api/fees/:id
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  updateFee
);

/* =========================================================
   DELETE FEE
   DELETE /api/fees/:id
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  deleteFee
);

/* =========================================================
   GET SINGLE FEE
   GET /api/fees/:id

   Keep this after payment route for clarity.
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  getFeeById
);

module.exports = router;