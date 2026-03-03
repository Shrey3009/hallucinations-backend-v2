const mongoose = require("mongoose");

const AUTSchema = new mongoose.Schema(
  {
    preSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreSurvey",
      required: true,
    },
    generatedIdeas: [{ type: String }],
    selectedIdea: { type: String },
    refinedIdea: { type: String },
    round: Number,
    object: String,
    temperature: Number,
    task: Number,
  },
  { timestamps: true }
);

const AUT_gpt = mongoose.model("AUT_gpt", AUTSchema);

module.exports = AUT_gpt;
