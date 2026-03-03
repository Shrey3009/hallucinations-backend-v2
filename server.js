// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
const PreSurvey = require("./routes/PreSurveyRoutes");
const PostSurvey = require("./routes/PostSurveyRoutes");
const AUT = require("./routes/AUTRoutes");
const AUT_gpt = require("./routes/AUT_gptRoutes");
const chatMessages = require("./routes/chatMessagesRoute");
const PatentRoutes = require("./routes/PatentRoutes");
const openaiRoute = require("./routes/OpenAiRoute");
const TaskPostSurvey = require("./routes/TaskPostSurveyRoutes");

app.use("/api", PreSurvey);
app.use("/api", AUT);
app.use("/api", AUT_gpt);
app.use("/api", PostSurvey);
app.use("/api/chatbotmessages", chatMessages);
app.use("/api", PatentRoutes);
app.use("/api", openaiRoute);
app.use("/api", TaskPostSurvey);

// Health check
app.get("/api/dbcheck", (req, res) => {
  if (global.mongoose?.conn) {
    res.json({ status: "ok", message: "MongoDB already connected" });
  } else {
    res.status(500).json({ status: "error", message: "Not connected" });
  }
});

// Export for Vercel
module.exports = app;

// Always connect to DB (both local + Vercel)
connectDB()
  .then(() => {
    if (require.main === module) {
      // Local only: start listening
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () =>
        console.log(`✅ Server running locally at http://localhost:${PORT}`)
      );
    }
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
