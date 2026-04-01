const mongoose = require("mongoose");

const TaskPostSurveySchema = new mongoose.Schema({
    preSurveyId: { type: mongoose.Schema.Types.ObjectId, ref: "PreSurvey", required: true },
    taskNumber: { type: Number, required: true },
    taskType: { type: String, required: true },
    familiarity: { type: String, required: true },
    difficulty: { type: String, required: true },
    aiPhase1Expansion: { type: String },
    aiPhase3Refinement: { type: String },
    aiPhaseHelpfulness: { type: String },
    aiSuggestionsGroundedness: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaskPostSurvey", TaskPostSurveySchema);
