const express = require("express");
const {
  getLatestMessage,
  publishMessage,
} = require("../middlewares/mqttHandler");
const router = express.Router();

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
router.post("/publish", async (req, res) => {
  const { s, p } = req.body;

  if (!s || !p) {
    return res.status(400).json({
      success: false,
      message: "s and p are required.",
    });
  }

  try {
    await publishMessage("esp8266/wifi", { s, p });
    res.json({ success: true, message: "Message published successfully" });
  } catch (error) {
    console.error("Error publishing message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish message.",
    });
  }
});

module.exports = router;
