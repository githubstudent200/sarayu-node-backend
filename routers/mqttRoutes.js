const express = require("express");
const {
  getLatestMessage,
  publishMessage,
} = require("../middlewares/mqttHandler");
const router = express.Router();

router.get("/messages", (req, res) => {
  const latestMessage = getLatestMessage();

  if (!latestMessage) {
    return res.json({ success: false, message: "No message available yet" });
  }

  res.json({
    success: true,
    message: latestMessage,
  });
});

router.get("/saved-messages", async (req, res) => {
  try {
    const messages = await MessageModel.find();
    res.json({ success: true, data: messages });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching messages" });
  }
});

// POST /api/mqtt/publish
router.post("/publish", (req, res) => {
  const { topic, message } = req.body;

  if (!topic || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Topic and message are required." });
  }

  publishMessage(topic, message);

  res.json({ success: true, message: "Message published successfully" });
});

module.exports = router;
