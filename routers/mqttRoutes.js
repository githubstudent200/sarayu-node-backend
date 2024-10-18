const express = require("express");
const {
  getLatestMessage,
  publishMessage,
} = require("../middlewares/mqttHandler");
const router = express.Router();
const MessageModel = require("../models/mqtt-message-model");

router.get("/messages", (req, res) => {
  const { email } = req.query; // Ensure this is unique per user (or use req.user)

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  const user = { email }; // Replace with req.user if using authentication
  const latestMessage = getLatestMessage(user);

  if (!latestMessage) {
    return res
      .status(404)
      .json({ success: false, message: "No message available yet" });
  }

  res.json({
    success: true,
    message: latestMessage,
  });
});

router.post("/saved-messages", async (req, res) => {
  try {
    const { topic } = req.body;
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(1, parseInt(req.query.limit)) || 10;
    const { fromDate, toDate, threshold } = req.query;

    // Convert to Date objects
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    const topicDocument = await MessageModel.findOne({ topic });
    if (!topicDocument) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found." });
    }

    const messages = topicDocument.messages || [];
    // Filter messages based on date range and threshold
    const filteredMessages = messages.filter((message) => {
      const messageDate = new Date(message.timestamp);
      return (
        (!from || messageDate >= from) &&
        (!to || messageDate <= to) &&
        (!threshold || message.message >= parseFloat(threshold))
      );
    });

    const skip = (page - 1) * limit;
    const paginatedMessages = filteredMessages.slice(skip, skip + limit);
    const totalMessages = filteredMessages.length;
    const totalPages = Math.ceil(totalMessages / limit);

    res.json({
      success: true,
      data: {
        topic: topicDocument.topic,
        messagesCount: paginatedMessages.length,
        messages: paginatedMessages,
        totalMessages,
        page,
        totalPages,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching messages" });
  }
});

// POST /api/mqtt/publish
// router.post("/publish", async (req, res) => {
//   const { s, p } = req.body;

//   if (!s || !p) {
//     return res.status(400).json({
//       success: false,
//       message: "s and p are required.",
//     });
//   }

//   try {
//     await publishMessage("esp8266/wifi", { s, p });
//     res.json({ success: true, message: "Message published successfully" });
//   } catch (error) {
//     console.error("Error publishing message:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to publish message.",
//     });
//   }
// });

module.exports = router;
