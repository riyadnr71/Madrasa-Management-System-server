const express = require("express");

const router = express.Router();

// =========================================================
// Cloudinary Image Proxy
// =========================================================
router.get("/", async (req, res) => {
  try {
    const imageUrl = String(
      req.query.url || ""
    ).trim();

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid image URL",
      });
    }

    // Only Cloudinary
    const allowedHosts = [
      "res.cloudinary.com",
    ];

    if (
      !allowedHosts.includes(
        parsedUrl.hostname
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only Cloudinary images are allowed",
      });
    }

    const response = await fetch(
      imageUrl
    );

    if (!response.ok) {
      return res.status(404).json({
        success: false,
        message:
          "Image could not be fetched",
      });
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "image/jpeg";

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=86400"
    );

    return res.send(buffer);
  } catch (error) {
    console.error(
      "Public Image Proxy Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load image",
    });
  }
});

module.exports = router;