// routes/chatMessagesRoute.js
const express = require("express");
const router = express.Router();

const ChatMessages = require("../models/chatMessages");       // <-- your path may differ
const PatentSelection = require("../models/PatentSelection"); // <-- your path may differ

// Create a chat-messages record with SERVER-ENFORCED level
router.post("/", async (req, res) => {
  try {
    const { preSurveyId, task, round, chatMessages } = req.body;

    // Basic validation
    if (!preSurveyId || typeof task === "undefined") {
      return res.status(400).json({ error: "preSurveyId and task are required" });
    }

    const taskNum = Number(task);

    if (round === null || typeof round === "undefined") {
      return res.status(400).json({ error: "round is required" });
    }

    // Always fetch the level from PatentSelection; never trust client body
    const mapping = await PatentSelection.findOne({ preSurveyId }).lean();
    if (!mapping) {
      return res.status(404).json({ error: "PatentSelection mapping not found for this preSurveyId" });
    }

    if (!mapping.level) {
      return res.status(400).json({ error: "Level missing in PatentSelection" });
    }

    const enforcedLevel = mapping.level; // "low" | "medium" | "high"

    // Persist using the enforcedLevel
    const doc = await ChatMessages.create({
      preSurveyId,
      task: taskNum,
      round: Number(round),
      level: enforcedLevel,
      chatMessages,
    });

    // Return the saved doc so the client can log the actual level used
    return res.status(201).json({ ok: true, saved: doc });
  } catch (err) {
    console.error("Failed to save chat messages:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
