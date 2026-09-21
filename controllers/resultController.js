
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

/* =========================================================
   GRADE CALCULATOR
========================================================= */

const calculateGrade = (percentage) => {
  const p = Number(percentage);

  if (p >= 80) return "A+";
  if (p >= 70) return "A";
  if (p >= 60) return "A-";
  if (p >= 50) return "B";
  if (p >= 40) return "C";
  if (p >= 33) return "D";

  return "F";
};

/* =========================================================
   GPA CALCULATOR
========================================================= */

const calculateGPA = (grade) => {
  const gradePoints = {
    "A+": 5.0,
    A: 4.0,
    "A-": 3.5,
    B: 3.0,
    C: 2.0,
    D: 1.0,
    F: 0.0,
  };

  return gradePoints[grade] ?? 0;
};

/* =========================================================
   ADD RESULT
========================================================= */

const addResult = async (req, res) => {
  try {
    const db = getDB();

    const studentsCollection = db.collection("students");
    const subjectsCollection = db.collection("subjects");
    const resultsCollection = db.collection("results");

    const {
      studentId,
      month,
      examName,
      year,
      marks,
      session,
      aPlusRequired,
    } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !studentId ||
      !month ||
      !examName ||
      !year ||
      !marks ||
      typeof marks !== "object" ||
      Array.isArray(marks)
    ) {
      return res.status(400).send({
        success: false,
        message:
          "Student, month, exam, year and marks are required",
      });
    }

    if (!ObjectId.isValid(studentId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid student ID",
      });
    }

    const cleanMonth = String(month).trim();
    const cleanExamName = String(examName).trim();
    const cleanYear = String(year).trim();

    if (!cleanMonth) {
      return res.status(400).send({
        success: false,
        message: "Month is required",
      });
    }

    if (!cleanExamName) {
      return res.status(400).send({
        success: false,
        message: "Exam name is required",
      });
    }

    if (!cleanYear) {
      return res.status(400).send({
        success: false,
        message: "Year is required",
      });
    }

    /* =====================================================
       FIND STUDENT
    ===================================================== */

    const student = await studentsCollection.findOne({
      _id: new ObjectId(studentId),
    });

    if (!student) {
      return res.status(404).send({
        success: false,
        message: "Student not found",
      });
    }

    /* =====================================================
       GET CLASS SUBJECTS
    ===================================================== */

    const subjects = await subjectsCollection
      .find({
        className: student.className,
      })
      .sort({
        subjectName: 1,
      })
      .toArray();

    if (!subjects.length) {
      return res.status(400).send({
        success: false,
        message: "No subjects found for this class",
      });
    }

    /* =====================================================
       A+ REQUIRED SUBJECTS
    ===================================================== */

    const totalSubjects = subjects.length;

    let requiredAPlus = Number(aPlusRequired);

    if (!Number.isInteger(requiredAPlus)) {
      requiredAPlus = totalSubjects;
    }

    if (
      requiredAPlus < 1 ||
      requiredAPlus > totalSubjects
    ) {
      return res.status(400).send({
        success: false,
        message:
          `A+ Required Subjects must be between 1 and ${totalSubjects}`,
      });
    }

    /* =====================================================
       SESSION
    ===================================================== */

    const cleanSession =
      session !== undefined &&
      session !== null
        ? String(session).trim()
        : String(student.session || "").trim();

    /* =====================================================
       DUPLICATE RESULT CHECK

       Student + Month + Exam + Year
    ===================================================== */

    const existingResult =
      await resultsCollection.findOne({
        studentId: student._id,
        month: cleanMonth,
        examName: cleanExamName,
        year: cleanYear,
      });

    if (existingResult) {
      return res.status(409).send({
        success: false,
        message:
          "Result for this student, month, exam and year already exists",
      });
    }

    /* =====================================================
       CALCULATION VARIABLES
    ===================================================== */

    let totalMarks = 0;
    let totalFullMarks = 0;
    let hasFailed = false;
    let aPlusCount = 0;

    const resultSubjects = [];

    /* =====================================================
       SUBJECT LOOP
    ===================================================== */

    for (const subject of subjects) {
      const subjectId = subject._id.toString();

      const subjectInput = marks[subjectId];

      if (
        subjectInput === undefined ||
        subjectInput === null
      ) {
        return res.status(400).send({
          success: false,
          message:
            `Marks are required for ${subject.subjectName}`,
        });
      }

      /* ---------------------------------------------------
         GET MARKS
      --------------------------------------------------- */

      let obtained;
      let fullMarks;
      let passMarks;

      if (
        typeof subjectInput === "object" &&
        !Array.isArray(subjectInput)
      ) {
        obtained = Number(
          subjectInput.obtainedMarks
        );

        fullMarks = Number(
          subjectInput.fullMarks
        );

        passMarks =
          subjectInput.passMarks !== undefined &&
          subjectInput.passMarks !== ""
            ? Number(subjectInput.passMarks)
            : Number(subject.passMarks);
      } else {
        obtained = Number(subjectInput);
        fullMarks = Number(subject.fullMarks);
        passMarks = Number(subject.passMarks);
      }

      /* ---------------------------------------------------
         FULL MARKS FALLBACK
      --------------------------------------------------- */

      if (
        !Number.isFinite(fullMarks) ||
        fullMarks <= 0
      ) {
        fullMarks = Number(subject.fullMarks);
      }

      if (
        !Number.isFinite(fullMarks) ||
        fullMarks <= 0
      ) {
        return res.status(400).send({
          success: false,
          message:
            `${subject.subjectName} has invalid full marks`,
        });
      }

      /* ---------------------------------------------------
         PASS MARKS FALLBACK
      --------------------------------------------------- */

      if (
        !Number.isFinite(passMarks) ||
        passMarks < 0
      ) {
        passMarks = Math.ceil(
          fullMarks * 0.33
        );
      }

      /* ---------------------------------------------------
         VALIDATE PASS MARKS
      --------------------------------------------------- */

      if (passMarks > fullMarks) {
        return res.status(400).send({
          success: false,
          message:
            `${subject.subjectName}: Pass marks cannot exceed ${fullMarks}`,
        });
      }

      /* ---------------------------------------------------
         VALIDATE OBTAINED
      --------------------------------------------------- */

      if (
        !Number.isFinite(obtained) ||
        obtained < 0
      ) {
        return res.status(400).send({
          success: false,
          message:
            `Invalid marks for ${subject.subjectName}`,
        });
      }

      if (obtained > fullMarks) {
        return res.status(400).send({
          success: false,
          message:
            `${subject.subjectName} marks cannot exceed ${fullMarks}`,
        });
      }

      /* ===================================================
         PERCENTAGE
      =================================================== */

      const percentage =
        (obtained / fullMarks) * 100;

      /* ===================================================
         GRADE
      =================================================== */

      const grade =
        calculateGrade(percentage);

      const gradePoint =
        calculateGPA(grade);

      /* ===================================================
         STATUS
      =================================================== */

      const subjectStatus =
        obtained >= passMarks
          ? "Pass"
          : "Fail";

      if (subjectStatus === "Fail") {
        hasFailed = true;
      }

      /* ===================================================
         A+ COUNT
      =================================================== */

      if (grade === "A+") {
        aPlusCount++;
      }

      /* ===================================================
         TOTAL
      =================================================== */

      totalMarks += obtained;
      totalFullMarks += fullMarks;

      /* ===================================================
         SUBJECT RESULT

         IMPORTANT:
         এখানে শুধু subject data থাকবে।
      =================================================== */

      resultSubjects.push({
        subjectId: subject._id,
        subjectName:
          subject.subjectName ||
          subject.name ||
          "Subject",

        fullMarks,
        passMarks,
        obtainedMarks: obtained,

        percentage: Number(
          percentage.toFixed(2)
        ),

        grade,
        gradePoint,

        status: subjectStatus,
      });
    }

    /* =====================================================
       OVERALL PERCENTAGE
    ===================================================== */

    const overallPercentage =
      totalFullMarks > 0
        ? (totalMarks / totalFullMarks) * 100
        : 0;

    /* =====================================================
       OVERALL GRADE
    ===================================================== */

    let overallGrade;

    /*
      যদি কোনো subject fail করে,
      overall A+ হবে না।
    */

    if (
      !hasFailed &&
      aPlusCount >= requiredAPlus
    ) {
      overallGrade = "A+";
    } else {
      overallGrade =
        calculateGrade(overallPercentage);
    }

    /* =====================================================
       OVERALL GPA
    ===================================================== */

    const totalGradePoints =
      resultSubjects.reduce(
        (sum, subject) =>
          sum + Number(subject.gradePoint || 0),
        0
      );

    let gpa =
      resultSubjects.length > 0
        ? totalGradePoints /
          resultSubjects.length
        : 0;

    /*
      A+ requirement পূরণ হলে
      এবং কোনো subject fail না হলে
      GPA = 5.00
    */

    if (
      !hasFailed &&
      aPlusCount >= requiredAPlus
    ) {
      gpa = 5;
    }

    /* =====================================================
       FINAL STATUS
    ===================================================== */

    const status =
      hasFailed
        ? "Fail"
        : "Pass";

    /* =====================================================
       RESULT DOCUMENT
    ===================================================== */

    const now = new Date();

    const resultData = {
      studentId: student._id,

      studentName:
        student.name ||
        student.studentName ||
        "",

      studentIdCard:
        student.idCard || "",

      roll:
        student.roll || "",

      className:
        student.className || "",

      session:
        cleanSession,

      /* ================================================
         PUBLIC SEARCH FIELDS
      ================================================ */

      month:
        cleanMonth,

      examName:
        cleanExamName,

      year:
        cleanYear,

      /* ================================================
         SUBJECT RESULTS
      ================================================ */

      subjects:
        resultSubjects,

      /* ================================================
         A+ INFORMATION
      ================================================ */

      totalSubjects,

      aPlusRequired:
        requiredAPlus,

      aPlusCount,

      /* ================================================
         OVERALL MARKS
      ================================================ */

      totalMarks,

      totalFullMarks,

      percentage:
        Number(
          overallPercentage.toFixed(2)
        ),

      /* ================================================
         FINAL RESULT
      ================================================ */

      grade:
        overallGrade,

      gpa:
        Number(
          gpa.toFixed(2)
        ),

      status,

      createdAt: now,
      updatedAt: now,
    };

    /* =====================================================
       INSERT
    ===================================================== */

    const inserted =
      await resultsCollection.insertOne(
        resultData
      );

    return res.status(201).send({
      success: true,

      message:
        "Result added successfully",

      result: {
        _id:
          inserted.insertedId,

        ...resultData,
      },
    });
  } catch (error) {
    console.error(
      "Add Result Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        error.message ||
        "Failed to add result",
    });
  }
};

/* =========================================================
   GET RESULTS
========================================================= */

const getResults = async (req, res) => {
  try {
    const db = getDB();

    const resultsCollection =
      db.collection("results");

    const results =
      await resultsCollection
        .find({})
        .sort({
          createdAt: -1,
        })
        .toArray();

    return res.send({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error(
      "Get Results Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to load results",
    });
  }
};

/* =========================================================
   GET SINGLE RESULT
========================================================= */

const getResultById = async (req, res) => {
  try {
    const db = getDB();

    const resultsCollection =
      db.collection("results");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message:
          "Invalid result ID",
      });
    }

    const result =
      await resultsCollection.findOne({
        _id:
          new ObjectId(id),
      });

    if (!result) {
      return res.status(404).send({
        success: false,
        message:
          "Result not found",
      });
    }

    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get Result Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to load result",
    });
  }
};

/* =========================================================
   DELETE RESULT
========================================================= */

const deleteResult = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const resultsCollection =
      db.collection("results");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message:
          "Invalid result ID",
      });
    }

    const result =
      await resultsCollection.deleteOne({
        _id:
          new ObjectId(id),
      });

    if (!result.deletedCount) {
      return res.status(404).send({
        success: false,
        message:
          "Result not found",
      });
    }

    return res.send({
      success: true,
      message:
        "Result deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete result error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to delete result",
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  addResult,
  getResults,
  getResultById,
  deleteResult,
};

