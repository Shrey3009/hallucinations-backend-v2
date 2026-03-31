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
    const { preSurveyId } = req.body;

    if (!preSurveyId) {
      return res.status(400).json({ success: false, message: "preSurveyId is required" });
    }

    // Check if already assigned
    const existingAssignment = await PatentSelection.findOne({ preSurveyId })
      .populate("task1Patent")
      .populate("task2Patent");
    if (existingAssignment) {
      return res.status(200).json({ success: true, message: "Already assigned", data: existingAssignment });
    }

    // --- Balanced Randomization Logic ---
    const categories = [1, 2, 3, 4];
    const levels = ["low", "medium", "high"];
    const sequences = ["baseline_first", "ai_first"];

    // 1. Create all 24 combinations
    const combinations = [];
    for (const cIdx of categories) {
      for (const lvl of levels) {
        for (const seq of sequences) {
          combinations.push({ categoryIndex: cIdx, level: lvl, taskSequence: seq });
        }
      }
    }

    // 2. Count existing entries for each combination
    const counts = await Promise.all(
      combinations.map(async (comb) => {
        const count = await PatentSelection.countDocuments(comb);
        return { ...comb, count };
      })
    );

    // 3. Find segments with the lowest count
    const minCount = Math.min(...counts.map((c) => c.count));
    const bestCombinations = counts.filter((c) => c.count === minCount);

    // 4. Pick one randomly from the candidates
    const selected = bestCombinations[Math.floor(Math.random() * bestCombinations.length)];
    const { categoryIndex, level, taskSequence } = selected;

    // 5. Get patents for that category
    const patentsInCategory = await Patent.find({ categoryIndex });
    if (patentsInCategory.length < 2) {
      return res.status(400).json({ success: false, message: `Only ${patentsInCategory.length} patents found in category ${categoryIndex}` });
    }

    // Randomize which patent is task1 vs task2
    const shuffledPatents = patentsInCategory.sort(() => Math.random() - 0.5);
    const task1Patent = shuffledPatents[0];
    const task2Patent = shuffledPatents[1];

    // 6. Save assignment
    const patentSelection = new PatentSelection({
      preSurveyId,
      task1Patent: task1Patent._id,
      task2Patent: task2Patent._id,
      task1Level: level,
      task2Level: level,
      categoryIndex,
      level,
      taskSequence,
    });

    const savedSelection = await patentSelection.save();

    res.status(201).json({
      success: true,
      data: {
        ...savedSelection.toObject(),
        task1Patent,
        task2Patent,
      },
    });
  } catch (error) {
    console.error("Error assigning patents:", error);
    res.status(500).json({ success: false, message: "An error occurred", error: error.message });
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
