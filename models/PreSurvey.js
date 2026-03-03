const mongoose = require("mongoose");

const PreSurveySchema = new mongoose.Schema(
  {
    age: {
      type: String,
      required: [true, "Age is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "other"],
      trim: true,
    },
    race: {
      type: String,
      required: [true, "Race is required"],
      trim: true,
    },
    experience: {
      type: String,
      required: [true, "Experience is required"],
      enum: ["none", "Beginner", "Intermediate", "Advanced"],
      trim: true,
    },
    designExperience: {
      type: String,
      required: [true, "Design experience is required"],
      enum: ["None", "Some", "Extensive"],
      trim: true,
    },

  },
  {
    timestamps: true,
  }
);

const PreSurvey = mongoose.model("PreSurvey", PreSurveySchema);

module.exports = PreSurvey;
