require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");

// =========================================================
// ROUTES
// =========================================================

// AUTH
const authRoutes = require("./routes/authRoutes");

// STUDENTS
const studentRoutes = require("./routes/studentRoutes");

// SUBJECTS
const subjectRoutes = require("./routes/subjectRoutes");

// RESULTS
const resultRoutes = require("./routes/resultRoutes");
const publicResultRoutes = require("./routes/publicResultRoutes");

// PUBLIC IMAGE
const publicImageRoutes = require("./routes/publicImageRoutes");

// FEES
const feeRoutes = require("./routes/feeRoutes");
const feeSetupRoutes = require("./routes/feeSetupRoutes");

// TEACHERS
const teacherRoutes = require("./routes/teacherRoutes");

// EXPENSES
const expenseRoutes = require("./routes/expenseRoutes");

// NOTICES
const noticeRoutes = require("./routes/noticeRoutes");
const publicNoticeRoutes = require("./routes/publicNoticeRoutes");

// DASHBOARD
const dashboardRoutes = require("./routes/dashboardRoutes");

// REPORTS
const reportRoutes = require("./routes/reportRoutes");

// =========================================================
// APP
// =========================================================

const app = express();

// =========================================================
// CORS
// =========================================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://schoolwebsite71.netlify.app",
      "https://school91.netlify.app"

    ],
    credentials: true,
  })
);

// =========================================================
// BODY PARSER
// =========================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =========================================================
// HEALTH CHECK
// =========================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Madrasa Management API চলছে ✓",
  });
});

// =========================================================
// AUTH
// =========================================================

app.use(
  "/api/auth",
  authRoutes
);

// =========================================================
// DASHBOARD
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/dashboard",
  dashboardRoutes
);

// =========================================================
// REPORTS
// 🔐 Requires authentication
// =========================================================
//
// Result Report:
// GET /api/reports/results
//
// Fee Report:
// GET /api/reports/fees
//
// Expense Report:
// GET /api/reports/expenses
//
// Financial Report:
// GET /api/reports/financial
// =========================================================

app.use(
  "/api/reports",
  reportRoutes
);

// =========================================================
// STUDENTS
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/students",
  studentRoutes
);

// =========================================================
// SUBJECTS
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/subjects",
  subjectRoutes
);

// =========================================================
// RESULTS - ADMIN
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/results",
  resultRoutes
);

// =========================================================
// PUBLIC RESULT
// 🌍 No authentication
// =========================================================

app.use(
  "/api/public-result",
  publicResultRoutes
);

// =========================================================
// PUBLIC IMAGE
// 🖼️ JPG / PDF IMAGE EXPORT
// 🌍 No authentication
// =========================================================

app.use(
  "/api/public-image",
  publicImageRoutes
);

// =========================================================
// FEES
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/fees",
  feeRoutes
);

// =========================================================
// FEE SETUP
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/fee-setups",
  feeSetupRoutes
);

// =========================================================
// TEACHERS
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/teachers",
  teacherRoutes
);

// =========================================================
// EXPENSES
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/expenses",
  expenseRoutes
);

// =========================================================
// NOTICES - ADMIN
// 🔐 Requires authentication
// =========================================================

app.use(
  "/api/notices",
  noticeRoutes
);

// =========================================================
// PUBLIC NOTICES
// 🌍 No authentication
// =========================================================

app.use(
  "/api/public-notices",
  publicNoticeRoutes
);

// =========================================================
// 404
// =========================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Global Error:",
      error
    );

    // -----------------------------------------------------
    // MULTER - FILE SIZE
    // -----------------------------------------------------

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Image size must be less than 5MB",
      });
    }

    // -----------------------------------------------------
    // MULTER - INVALID FILE TYPE
    // -----------------------------------------------------

    if (
      error.message ===
      "Only image files are allowed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only image files are allowed",
      });
    }

    // -----------------------------------------------------
    // DEFAULT ERROR
    // -----------------------------------------------------

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error: error.message,
    });
  }
);

// =========================================================
// SERVER
// =========================================================

const PORT =
  process.env.PORT || 5000;

// =========================================================
// START SERVER
// =========================================================

const startServer = async () => {
  try {
    // -----------------------------------------------------
    // CONNECT DATABASE
    // -----------------------------------------------------

    await connectDB();

    // -----------------------------------------------------
    // START EXPRESS SERVER
    // -----------------------------------------------------

    app.listen(
      PORT,
      () => {
        console.log("");

        console.log(
          "========================================"
        );

        console.log(
          "🚀 Madrasa Management Server Started"
        );

        console.log(
          "========================================"
        );

        console.log(
          `🚀 Server running on port ${PORT}`
        );

        console.log(
          `🌐 http://localhost:${PORT}`
        );

        // -------------------------------------------------
        // DASHBOARD
        // -------------------------------------------------

        console.log("");

        console.log(
          "📊 Dashboard:"
        );

        console.log(
          `   http://localhost:${PORT}/api/dashboard`
        );

        // -------------------------------------------------
        // REPORTS
        // -------------------------------------------------

        console.log("");

        console.log(
          "📑 Reports:"
        );

        console.log(
          `   Result:    http://localhost:${PORT}/api/reports/results`
        );

        console.log(
          `   Fee:       http://localhost:${PORT}/api/reports/fees`
        );

        console.log(
          `   Expense:   http://localhost:${PORT}/api/reports/expenses`
        );

        console.log(
          `   Financial: http://localhost:${PORT}/api/reports/financial`
        );

        // -------------------------------------------------
        // PUBLIC RESULT
        // -------------------------------------------------

        console.log("");

        console.log(
          "📢 Public Result:"
        );

        console.log(
          `   http://localhost:${PORT}/api/public-result`
        );

        // -------------------------------------------------
        // PUBLIC NOTICES
        // -------------------------------------------------

        console.log("");

        console.log(
          "📢 Public Notices:"
        );

        console.log(
          `   http://localhost:${PORT}/api/public-notices`
        );

        // -------------------------------------------------
        // PUBLIC IMAGE
        // -------------------------------------------------

        console.log("");

        console.log(
          "🖼️ Public Image:"
        );

        console.log(
          `   http://localhost:${PORT}/api/public-image`
        );

        // -------------------------------------------------
        // END
        // -------------------------------------------------

        console.log("");

        console.log(
          "========================================"
        );

        console.log("");
      }
    );
  } catch (error) {
    console.error(
      "❌ Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

// =========================================================
// RUN SERVER
// =========================================================

startServer();