const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  message: { type: String, required: true },
  direction: { type: String, enum: ["incoming", "outgoing"], required: false },
  sender: { type: String, required: true },
});

const chatMessagesSchema = new mongoose.Schema({
  chatMessages: [chatSchema],
  preSurveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PreSurvey",
    required: true,
  },
  task: { type: Number, required: true },
  round: { type: Number, required: true },
  level: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true,
  },
});

const ChatMessages = mongoose.model("ChatMessages", chatMessagesSchema);

module.exports = ChatMessages;
