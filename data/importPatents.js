// importPatents.js
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Patent = require("../models/Patent");
require("dotenv").config();
const path = require("path");

// 1. Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 2. Load Excel file
const excelPath = path.join(__dirname, "Patent_Data_Updated.xlsx");
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets["Simplified Version"]; // new sheet name
const rows = XLSX.utils.sheet_to_json(sheet);

// 3. Transform rows into Patent schema format
const patents = rows.map((row, index) => ({
  categoryIndex: row["Category_Index"] || 0,
  category: row["Category"] || "Uncategorized",
  classifications: row["Classifications"] || "",
  patentName: row["Patent Name"] || `Unnamed Patent ${index + 1}`,
  patentLink: row["Patent Link"] || "",
  patentDescription: row["Patent Description"] || "",
  status: (row["Status"] || "active").toLowerCase(), // Ensure status is lowercase
  year: row["Year"] || null,
  lowHallucinationExample: row["Low Example"] || "",
  mediumHallucinationExample: row["Medium Example"] || "",
  highHallucinationExample: row["High Example"] || "",
}));

// 4. Save into MongoDB
(async () => {
  try {
    await Patent.deleteMany({});
    console.log("Cleared old patents");

    await Patent.insertMany(patents);
    console.log(`Inserted ${patents.length} patents into MongoDB`);

    mongoose.connection.close();
  } catch (err) {
    console.error("Error inserting patents:", err);
    mongoose.connection.close();
  }
})();
