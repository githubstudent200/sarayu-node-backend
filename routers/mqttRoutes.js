// mqttRoutes.js
const express = require("express");
const {
  getLatestMessage,
  subscribeToTopic,
} = require("../middlewares/mqttHandler");
const MessageModel = require("../models/mqtt-message-model");
const moment = require("moment-timezone");

const router = express.Router();

// Endpoint to subscribe to a new topic
router.post("/subscribe", (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res
      .status(400)
      .json({ success: false, message: "Topic is required" });
  }

  subscribeToTopic(topic);
  res.json({ success: true, message: `Subscribed to topic: ${topic}` });
});

// Route to fetch the latest message for a specific topic
router.post("/messages", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res
      .status(400)
      .json({ success: false, message: "Topic is required" });
  }

  const latestMessage = await getLatestMessage(topic);
  if (!latestMessage) {
    return res
      .status(404)
      .json({ success: false, message: "No message available" });
  }

  res.json({ success: true, message: latestMessage });
});

router.post("/realtime-data/last-2-hours", async (req, res) => {
  const { topic } = req.body;
  console.log(topic);
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {
    const twoHoursAgo = moment()
      .tz("Asia/Kolkata")
      .subtract(2, "hours")
      .toDate();

    const messages = await MessageModel.findOne({
      topic,
      messages: { $elemMatch: { timestamp: { $gte: twoHoursAgo } } },
    })
      .select({
        topic: 1,
        messages: {
          $filter: {
            input: "$messages",
            as: "message",
            cond: { $gte: ["$$message.timestamp", twoHoursAgo] },
          },
        },
      })
      .sort({ "messages.timestamp": -1 });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to fetch paginated messages with filters
router.post("/saved-messages", async (req, res) => {
  const {
    topic,
    page = 1,
    limit = 500,
    fromDate,
    toDate,
    threshold,
  } = req.body;
  if (!topic) return res.status(400).json({ message: "Topic is required" });

  const topicDocument = await MessageModel.findOne({ topic });
  if (!topicDocument)
    return res.status(404).json({ message: "Topic not found" });

  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  const filteredMessages = topicDocument.messages.filter((message) => {
    const date = new Date(message.timestamp);
    return (
      (!from || date >= from) &&
      (!to || date <= to) &&
      (!threshold || message.message >= threshold)
    );
  });

  const skip = (page - 1) * limit;
  const paginatedMessages = filteredMessages.slice(skip, skip + limit);
  res.json({ success: true, data: paginatedMessages });
});

module.exports = router;
