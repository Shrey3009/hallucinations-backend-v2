const mongoose = require("mongoose");

const PatentSelectionSchema = new mongoose.Schema(
  {
    preSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreSurvey",
      required: true,
    },
    task1Patent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patent",
      required: true,
    },
    task2Patent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patent",
      required: true,
    },
    task1Level: { type: String, enum: ["low", "medium", "high"], required: true },
    task2Level: { type: String, enum: ["low", "medium", "high"], required: true },
    categoryIndex: { type: Number, required: true }, // Tracker: 1, 2, 3, or 4
    level: { type: String, enum: ["low", "medium", "high"], required: true }, // The single level used for both tasks
    taskSequence: { type: String, enum: ["baseline_first", "ai_first"], required: true }, // Tracker: [AUT, AUT_gpt] or [AUT_gpt, AUT]
  },
  {
    timestamps: true,
  }
);

const PatentSelection = mongoose.model(
  "PatentSelection",
  PatentSelectionSchema
);

module.exports = PatentSelection;
