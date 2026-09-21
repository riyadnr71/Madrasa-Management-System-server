const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

/* =========================================================
   ADD SUBJECT
========================================================= */

const addSubject = async (req, res) => {
  try {
    const db = getDB();

    const subjectsCollection =
      db.collection("subjects");

    const {
      className,
      subjectName,
      fullMarks,
      passMarks,
    } = req.body;

    if (
      !className ||
      !subjectName ||
      !fullMarks ||
      !passMarks
    ) {
      return res.status(400).send({
        success: false,
        message:
          "Class, subject name, full marks and pass marks are required",
      });
    }

    const marks = Number(fullMarks);
    const pass = Number(passMarks);

    /* -------------------------------------------------------
       VALIDATE FULL MARKS
    ------------------------------------------------------- */

    if (!Number.isFinite(marks) || marks <= 0) {
      return res.status(400).send({
        success: false,
        message:
          "Full marks must be greater than 0",
      });
    }

    /* -------------------------------------------------------
       VALIDATE PASS MARKS
    ------------------------------------------------------- */

    if (!Number.isFinite(pass) || pass <= 0) {
      return res.status(400).send({
        success: false,
        message:
          "Pass marks must be greater than 0",
      });
    }

    if (pass > marks) {
      return res.status(400).send({
        success: false,
        message:
          "Pass marks cannot be greater than full marks",
      });
    }

    const cleanClassName =
      className.trim();

    const cleanSubjectName =
      subjectName.trim();

    /* -------------------------------------------------------
       DUPLICATE CHECK
    ------------------------------------------------------- */

    const existingSubject =
      await subjectsCollection.findOne({
        className: cleanClassName,
        subjectName: cleanSubjectName,
      });

    if (existingSubject) {
      return res.status(409).send({
        success: false,
        message:
          "Subject already exists for this class",
      });
    }

    /* -------------------------------------------------------
       SUBJECT DATA
    ------------------------------------------------------- */

    const subject = {
      className: cleanClassName,

      subjectName: cleanSubjectName,

      fullMarks: marks,

      passMarks: pass,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    /* -------------------------------------------------------
       INSERT
    ------------------------------------------------------- */

    const result =
      await subjectsCollection.insertOne(
        subject
      );

    return res.status(201).send({
      success: true,

      message:
        "Subject added successfully",

      subject: {
        _id: result.insertedId,
        ...subject,
      },
    });
  } catch (error) {
    console.error(
      "Add Subject Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to add subject",
    });
  }
};

/* =========================================================
   GET SUBJECTS
========================================================= */

const getSubjects = async (req, res) => {
  try {
    const db = getDB();

    const subjectsCollection =
      db.collection("subjects");

    const {
      className,
    } = req.query;

    const query = {};

    if (className) {
      query.className =
        className.trim();
    }

    const subjects =
      await subjectsCollection
        .find(query)
        .sort({
          subjectName: 1,
        })
        .toArray();

    return res.send({
      success: true,

      data: subjects,
    });
  } catch (error) {
    console.error(
      "Get Subjects Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to load subjects",
    });
  }
};

/* =========================================================
   UPDATE SUBJECT
========================================================= */

const updateSubject = async (req, res) => {
  try {
    const db = getDB();

    const subjectsCollection =
      db.collection("subjects");

    const { id } = req.params;

    const {
      className,
      subjectName,
      fullMarks,
      passMarks,
    } = req.body;

    /* -------------------------------------------------------
       ID VALIDATION
    ------------------------------------------------------- */

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message:
          "Invalid subject ID",
      });
    }

    /* -------------------------------------------------------
       REQUIRED VALIDATION
    ------------------------------------------------------- */

    if (
      !className ||
      !subjectName ||
      !fullMarks ||
      !passMarks
    ) {
      return res.status(400).send({
        success: false,
        message:
          "Class, subject name, full marks and pass marks are required",
      });
    }

    const marks = Number(fullMarks);
    const pass = Number(passMarks);

    if (!Number.isFinite(marks) || marks <= 0) {
      return res.status(400).send({
        success: false,
        message:
          "Full marks must be greater than 0",
      });
    }

    if (!Number.isFinite(pass) || pass <= 0) {
      return res.status(400).send({
        success: false,
        message:
          "Pass marks must be greater than 0",
      });
    }

    if (pass > marks) {
      return res.status(400).send({
        success: false,
        message:
          "Pass marks cannot be greater than full marks",
      });
    }

    /* -------------------------------------------------------
       DUPLICATE CHECK
    ------------------------------------------------------- */

    const duplicate =
      await subjectsCollection.findOne({
        _id: {
          $ne: new ObjectId(id),
        },

        className:
          className.trim(),

        subjectName:
          subjectName.trim(),
      });

    if (duplicate) {
      return res.status(409).send({
        success: false,
        message:
          "Subject already exists for this class",
      });
    }

    /* -------------------------------------------------------
       UPDATE
    ------------------------------------------------------- */

    const result =
      await subjectsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },

        {
          $set: {
            className:
              className.trim(),

            subjectName:
              subjectName.trim(),

            fullMarks:
              marks,

            passMarks:
              pass,

            updatedAt:
              new Date(),
          },
        }
      );

    if (!result.matchedCount) {
      return res.status(404).send({
        success: false,
        message:
          "Subject not found",
      });
    }

    return res.send({
      success: true,

      message:
        "Subject updated successfully",
    });
  } catch (error) {
    console.error(
      "Update Subject Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to update subject",
    });
  }
};

/* =========================================================
   DELETE SUBJECT
========================================================= */

const deleteSubject = async (req, res) => {
  try {
    const db = getDB();

    const subjectsCollection =
      db.collection("subjects");

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message:
          "Invalid subject ID",
      });
    }

    const result =
      await subjectsCollection.deleteOne({
        _id: new ObjectId(id),
      });

    if (!result.deletedCount) {
      return res.status(404).send({
        success: false,
        message:
          "Subject not found",
      });
    }

    return res.send({
      success: true,

      message:
        "Subject deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Subject Error:",
      error
    );

    return res.status(500).send({
      success: false,
      message:
        "Failed to delete subject",
    });
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  addSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
};