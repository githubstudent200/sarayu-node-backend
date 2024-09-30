// MongoDB Schema
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  topic: String,
  messages: [
    {
      message: String,
      timestamp: Date,
    },
  ],
  savedAt: { type: Date, default: Date.now },
});

const MessageModel = mongoose.model("Message", messageSchema);

module.exports = MessageModel;
