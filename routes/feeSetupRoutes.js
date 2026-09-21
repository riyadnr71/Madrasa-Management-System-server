const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addFeeSetup,
  getFeeSetups,
  getFeeSetupByClass,
  updateFeeSetup,
  deleteFeeSetup,
} = require("../controllers/feeSetupController");

router.get(
  "/",
  authMiddleware,
  getFeeSetups
);

router.get(
  "/class/:className",
  authMiddleware,
  getFeeSetupByClass
);

router.post(
  "/",
  authMiddleware,
  addFeeSetup
);

router.put(
  "/:id",
  authMiddleware,
  updateFeeSetup
);

router.delete(
  "/:id",
  authMiddleware,
  deleteFeeSetup
);

module.exports = router;