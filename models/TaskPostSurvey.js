const mongoose = require("mongoose");

const TaskPostSurveySchema = new mongoose.Schema({
    preSurveyId: { type: mongoose.Schema.Types.ObjectId, ref: "PreSurvey", required: true },
    taskNumber: { type: Number, required: true },
    taskType: { type: String, required: true },
    accuracy: { type: String },
    helpfulness: { type: String },
    confidence: { type: String },
    difficulty: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaskPostSurvey", TaskPostSurveySchema);
