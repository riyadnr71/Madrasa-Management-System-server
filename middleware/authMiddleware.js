const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    /* =====================================================
       GET TOKEN FROM HEADER
    ===================================================== */

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    /* =====================================================
       CHECK BEARER TOKEN
    ===================================================== */

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    /* =====================================================
       VERIFY TOKEN
    ===================================================== */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /* =====================================================
       SAVE ADMIN DATA IN REQUEST
    ===================================================== */

    req.admin = decoded;

    /* =====================================================
       CONTINUE
    ===================================================== */

    next();
  } catch (error) {
    console.error(
      "Authentication Error:",
      error.message
    );

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;