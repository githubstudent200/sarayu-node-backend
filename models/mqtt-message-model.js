const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  topic: { type: String, index: true },
  messages: [
    {
      message: String,
      timestamp: Date,
    },
  ],
  savedAt: { type: Date, default: Date.now },
});

messageSchema.index({ topic: 1 });

const MessageModel = mongoose.model("Message", messageSchema);

module.exports = MessageModel;
