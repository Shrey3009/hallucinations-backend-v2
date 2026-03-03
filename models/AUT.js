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
    object: String,
  },
  { timestamps: true }
);

const AUT = mongoose.model("AUT", AUTSchema);

module.exports = AUT;
