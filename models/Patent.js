const mongoose = require("mongoose");

const PatentSchema = new mongoose.Schema(
  {
    categoryIndex: {
      type: Number,
      required: [true, "Category index is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    classifications: {
      type: String,
      required: false,
      trim: true,
    },
    patentName: {
      type: String,
      required: [true, "Patent name is required"],
      trim: true,
    },
    patentLink: {
      type: String,
      required: false,
      trim: true,
    },
    patentDescription: {
      type: String,
      required: [true, "Patent description is required"],
      trim: true,
    },
    status: {
      type: String,
      required: false,
      enum: ["active", "pending", "abandoned", "expired"],
      trim: true,
      default: "active"
    },
    year: {
      type: Number,
      required: false,
    },
    lowHallucinationExample: {
      type: String,
      trim: true,
      default: "",
    },
    mediumHallucinationExample: {
      type: String,
      trim: true,
      default: "",
    },
    highHallucinationExample: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Patent = mongoose.model("Patent", PatentSchema);

module.exports = Patent;
