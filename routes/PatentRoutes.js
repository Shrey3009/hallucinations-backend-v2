// patentroutes.js
const express = require("express");
const router = express.Router();
const Patent = require("../models/Patent");
const PatentSelection = require("../models/PatentSelection");

// Get all patents
router.get("/patents", async (req, res) => {
  try {
    const patents = await Patent.find().sort({
      categoryIndex: 1,
      patentName: 1,
    });

    res.status(200).json({
      success: true,
      message: "Patents retrieved successfully",
      data: patents,
    });
  } catch (error) {
    console.error("Error fetching patents:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching patents",
      error: error.message,
    });
  }
});

// Get patents by category
router.get("/patents/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const patents = await Patent.find({ category });

    res.status(200).json({
      success: true,
      message: `Patents in ${category} category retrieved successfully`,
      data: patents,
    });
  } catch (error) {
    console.error("Error fetching patents by category:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching patents",
      error: error.message,
    });
  }
});

// Assign patents to a user (called when PreSurvey is submitted)
router.post("/patent-assignment", async (req, res) => {
  try {
    console.log("Incoming body for /patent-assignment:", req.body);
    const { preSurveyId } = req.body;

    if (!preSurveyId) {
      return res.status(400).json({
        success: false,
        message: "preSurveyId is required",
      });
    }

    // Check if already assigned
    const existingAssignment = await PatentSelection.findOne({ preSurveyId });
    if (existingAssignment) {
      return res.status(200).json({
        success: true,
        message: "Patents already assigned to this user",
        data: existingAssignment,
      });
    }

    // Get all patents
    const allPatents = await Patent.find();
    console.log("Total patents in DB:", allPatents.length);

    if (allPatents.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Not enough patents in database to assign",
      });
    }

    // ---- Task Assignment (2 Tasks) ----
    const shuffledPatents = allPatents.sort(() => Math.random() - 0.5);
    const task1Patent = shuffledPatents[0];
    const task2Patent = shuffledPatents[1];

    // ---- Randomize levels for both tasks ----
    function shuffleArray(array) {
      const newArr = [...array];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    }

    const shuffledLevels = shuffleArray(["low", "medium", "high", "low"]).slice(0, 2);
    const [task1Level, task2Level] = shuffledLevels;

    // ---- Save assignment ----
    const patentSelection = new PatentSelection({
      preSurveyId,
      task1Patent: task1Patent._id,
      task2Patent: task2Patent._id,
      task1Level,
      task2Level,
    });

    const savedSelection = await patentSelection.save();

    const populatedSelection = await PatentSelection.findById(
      savedSelection._id
    )
      .populate("task1Patent")
      .populate("task2Patent");

    res.status(201).json({
      success: true,
      message: "Patents assigned successfully",
      data: populatedSelection,
    });
  } catch (error) {
    console.error("Error assigning patents:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while assigning patents",
      error: error.message,
    });
  }
});

// Get assignment for a user
router.get("/patent-assignment/:preSurveyId", async (req, res) => {
  try {
    const { preSurveyId } = req.params;

    const assignment = await PatentSelection.findOne({ preSurveyId })
      .populate("task1Patent")
      .populate("task2Patent");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "No patent assignment found for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patent assignment retrieved successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error fetching patent assignment:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching patent assignment",
      error: error.message,
    });
  }
});

// Get patent for specific task (with hallucination level)
router.get("/patent-for-task/:preSurveyId/:taskNumber", async (req, res) => {
  try {
    const { preSurveyId, taskNumber } = req.params;

    const assignment = await PatentSelection.findOne({ preSurveyId })
      .populate("task1Patent")
      .populate("task2Patent");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "No patent assignment found for this user",
      });
    }

    const taskMap = {
      1: assignment.task1Patent,
      2: assignment.task2Patent,
    };

    const levelMap = {
      1: assignment.task1Level,
      2: assignment.task2Level,
    };

    const patent = taskMap[taskNumber];
    const level = levelMap[taskNumber] || null;

    if (!patent) {
      return res.status(400).json({
        success: false,
        message: "Invalid task number. Must be 1 or 2",
      });
    }

    res.status(200).json({
      success: true,
      message: `Patent for task ${taskNumber} retrieved successfully`,
      data: patent,
      level, // hallucination level for tasks 2–4
    });
  } catch (error) {
    console.error("Error fetching patent for task:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching patent for task",
      error: error.message,
    });
  }
});

module.exports = router;
