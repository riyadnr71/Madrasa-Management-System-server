const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// =========================================================
// Public Result
// =========================================================
const getPublicResult = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const resultsCollection =
      db.collection("results");

    const studentsCollection =
      db.collection("students");

    const {
      studentId,
      month,
      examName,
      year,
    } = req.query;

    // =====================================================
    // Validation
    // =====================================================
    if (
      !studentId ||
      !month ||
      !examName ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID, month, exam name and year are required",
      });
    }

    const cleanStudentId =
      String(studentId).trim();

    const cleanMonth =
      String(month).trim();

    const cleanExamName =
      String(examName).trim();

    const cleanYear =
      String(year).trim();

    // =====================================================
    // Find Result
    // =====================================================
    const result =
      await resultsCollection.findOne({
        studentIdCard:
          cleanStudentId,

        month: cleanMonth,

        examName:
          cleanExamName,

        year: cleanYear,
      });

    if (!result) {
      return res.status(404).json({
        success: false,
        message:
          "Result not found for the provided information",
      });
    }

    // =====================================================
    // Find Student
    // =====================================================
    let student = null;

    // First: result.studentId
    if (result.studentId) {
      try {
        const studentObjectId =
          result.studentId instanceof
          ObjectId
            ? result.studentId
            : new ObjectId(
                String(
                  result.studentId
                )
              );

        student =
          await studentsCollection.findOne(
            {
              _id: studentObjectId,
            }
          );
      } catch (error) {
        console.log(
          "Student ObjectId lookup failed:",
          error.message
        );
      }
    }

    // =====================================================
    // Second: Student ID Card fallback
    // =====================================================
    if (!student && cleanStudentId) {
      student =
        await studentsCollection.findOne(
          {
            idCard:
              cleanStudentId,
          }
        );
    }

    // =====================================================
    // Student Photo
    // =====================================================
    const studentPhoto =
      student?.image ||
      result.studentPhoto ||
      result.image ||
      result.photo ||
      result.studentImage ||
      "";

    // =====================================================
    // School Information
    // =====================================================
    const schoolName =
      result.schoolName ||
      student?.schoolName ||
      student?.madrasaName ||
      student?.institutionName ||
      "";

    const schoolLogo =
      result.schoolLogo ||
      student?.schoolLogo ||
      student?.madrasaLogo ||
      student?.institutionLogo ||
      student?.logo ||
      "";

    const schoolAddress =
      result.schoolAddress ||
      student?.schoolAddress ||
      student?.madrasaAddress ||
      student?.institutionAddress ||
      "";

    // =====================================================
    // Subjects
    // =====================================================
    const subjects =
      Array.isArray(result.subjects)
        ? result.subjects
        : [];

    // =====================================================
    // A+ Count
    // =====================================================
    const calculatedAPlusCount =
      subjects.filter(
        (subject) =>
          String(
            subject.grade || ""
          ).toUpperCase() ===
          "A+"
      ).length;

    const aPlusCount =
      Number.isFinite(
        Number(result.aPlusCount)
      )
        ? Number(
            result.aPlusCount
          )
        : calculatedAPlusCount;

    // =====================================================
    // Public Result Object
    // =====================================================
    const publicResult = {
      _id: result._id,

      // School
      schoolName,

      schoolLogo,

      schoolAddress,

      // Student
      studentName:
        result.studentName ||
        student?.name ||
        "",

      studentIdCard:
        result.studentIdCard ||
        student?.idCard ||
        "",

      roll:
        result.roll ||
        student?.roll ||
        "",

      className:
        result.className ||
        student?.className ||
        "",

      session:
        result.session ||
        student?.session ||
        "",

      studentPhoto,

      // Examination
      month:
        result.month || "",

      examName:
        result.examName || "",

      year:
        result.year || "",

      // Subjects
      subjects,

      // Summary
      totalSubjects: Number(
        result.totalSubjects ||
          subjects.length
      ),

      aPlusRequired: Number(
        result.aPlusRequired || 0
      ),

      aPlusCount,

      totalMarks: Number(
        result.totalMarks || 0
      ),

      totalFullMarks: Number(
        result.totalFullMarks || 0
      ),

      percentage: Number(
        result.percentage || 0
      ),

      grade:
        result.grade || "F",

      gpa: Number(
        result.gpa || 0
      ),

      status:
        result.status || "Fail",
    };

    return res.status(200).json({
      success: true,
      result: publicResult,
    });
  } catch (error) {
    console.error(
      "Public Result Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch public result",
    });
  }
};

module.exports = {
  getPublicResult,
};