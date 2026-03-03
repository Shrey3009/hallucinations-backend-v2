const express = require("express");
const AUT = require("../models/AUT"); // Ensure this path is correct
const router = express.Router();
const mongoose = require("mongoose");

router.post("/AUT", async (req, res) => {
  const { generatedIdeas, selectedIdea, refinedIdea, preSurveyId, object } = req.body;

  // Validate preSurveyId
  if (!mongoose.Types.ObjectId.isValid(preSurveyId)) {
    return res.status(400).send("Invalid PreSurvey ID format.");
  }

  try {
    console.log("AUT got hit", req.body); // Logging the event correctly
    // Create a new AUT document
    const aut = new AUT({ generatedIdeas, selectedIdea, refinedIdea, preSurveyId, object });
    await aut.save();
    res.status(201).send(aut);
  } catch (error) {
    console.error("Error saving AUT:", error);
    res.status(500).send(error.message);
  }
});

module.exports = router;
