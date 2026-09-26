const jwt = require("jsonwebtoken");

const studentAuthMiddleware = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Student authentication required.",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const JWT_SECRET =
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY;

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration error.",
      });
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    /* -------------------------------------------------------
       Make sure this is a Student Token
    ------------------------------------------------------- */

    if (decoded.type !== "student") {
      return res.status(403).json({
        success: false,
        message: "Invalid student token.",
      });
    }

    req.student = decoded;

    next();
  } catch (error) {
    console.error(
      "Student Auth Middleware Error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Student session expired or invalid.",
    });
  }
};

module.exports =
  studentAuthMiddleware;