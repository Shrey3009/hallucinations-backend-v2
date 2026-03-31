const mongoose = require("mongoose");
const Patent = require("../models/Patent");
const patentData = require("./patentData");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

(async () => {
  try {
    // 1. Clear old patents
    await Patent.deleteMany({});
    console.log("Cleared old patents");

    // 2. Insert new patents
    await Patent.insertMany(patentData);
    console.log(`Successfully inserted ${patentData.length} patents into MongoDB`);

    process.exit(0);
  } catch (err) {
    console.error("Error importing patents:", err);
    process.exit(1);
  }
})();
