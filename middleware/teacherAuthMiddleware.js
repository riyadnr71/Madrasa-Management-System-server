const jwt = require("jsonwebtoken");

const teacherAuthMiddleware = (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Teacher authentication required.",
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

    if (decoded.type !== "teacher") {
      return res.status(403).json({
        success: false,
        message:
          "Invalid teacher token.",
      });
    }

    req.teacher = decoded;

    next();
  } catch (error) {
    console.error(
      "Teacher Auth Middleware Error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Teacher session expired or invalid.",
    });
  }
};

module.exports =
  teacherAuthMiddleware;