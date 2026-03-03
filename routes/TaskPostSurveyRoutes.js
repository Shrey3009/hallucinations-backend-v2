const express = require("express");
const router = express.Router();
const TaskPostSurvey = require("../models/TaskPostSurvey");

router.post("/TaskPostSurvey", async (req, res) => {
    try {
        console.log("TaskPostSurvey submission received:", req.body);
        const newEntry = new TaskPostSurvey(req.body);
        await newEntry.save();
        res.status(201).json({ success: true, message: "Task feedback saved successfully" });
    } catch (error) {
        console.error("Error saving task feedback:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
});

module.exports = router;
