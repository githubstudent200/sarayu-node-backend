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
    const limit = Math.max(1, parseInt(req.query.limit)) || 500;
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

    // Sort messages by timestamp in descending order
    filteredMessages.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

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

// filterout redundent value based on date and time starts here
router.post("/saved-messages/unique", async (req, res) => {
  try {
    const { topic } = req.body;
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(1, parseInt(req.query.limit)) || 500;
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

    // Use a Set to filter out duplicate timestamps
    const uniqueMessages = [];
    const seenTimestamps = new Set();

    filteredMessages.forEach((message) => {
      const messageTimestamp = new Date(message.timestamp).toISOString(); // Normalize the timestamp for comparison
      if (!seenTimestamps.has(messageTimestamp)) {
        uniqueMessages.push(message);
        seenTimestamps.add(messageTimestamp);
      }
    });

    // Sort messages by timestamp in descending order
    uniqueMessages.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const skip = (page - 1) * limit;
    const paginatedMessages = uniqueMessages.slice(skip, skip + limit);
    const totalMessages = uniqueMessages.length;
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
// filterout redundent value based on date and time ends here
router.post("/saved-messages/unique/nolimit", async (req, res) => {
  try {
    const { topic } = req.body;
    const { fromDate, toDate, threshold } = req.query;
    const { granularity } = req.query; // Retrieve granularity

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
        (!threshold || parseFloat(message.message) >= parseFloat(threshold))
      );
    });

    // Aggregation logic
    const aggregatedData = {};

    filteredMessages.forEach((message) => {
      const messageDate = new Date(message.timestamp);
      let key;

      switch (granularity) {
        case "second":
          key = messageDate.toISOString(); // Use the full timestamp
          break;
        case "minute":
          key = new Date(
            Math.floor(messageDate.getTime() / 60000) * 60000
          ).toISOString(); // Round to the nearest minute
          break;
        case "hour":
          key = new Date(
            Math.floor(messageDate.getTime() / 3600000) * 3600000
          ).toISOString(); // Round to the nearest hour
          break;
        case "day":
          key = messageDate.toISOString().split("T")[0]; // Use only the date part
          break;
        case "week":
          const startOfWeek = new Date(messageDate);
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          key = startOfWeek.toISOString().split("T")[0]; // Use start of week
          break;
        case "month":
          key = `${messageDate.getFullYear()}-${messageDate.getMonth() + 1}`; // Year-Month
          break;
        case "year":
          key = messageDate.getFullYear(); // Use only the year
          break;
        default:
          key = messageDate.toISOString(); // Default to second
      }

      // Initialize the key if it doesn't exist
      if (!aggregatedData[key]) {
        aggregatedData[key] = { totalValue: 0, count: 0 };
      }

      // Aggregate values (Assuming message.message contains the data to aggregate)
      aggregatedData[key].totalValue += parseFloat(message.message);
      aggregatedData[key].count += 1;
    });

    // Format the aggregated data
    const aggregatedResults = Object.entries(aggregatedData).map(
      ([key, { totalValue, count }]) => {
        return {
          timestamp: key,
          averageValue: count > 0 ? (totalValue / count).toFixed(2) : 0, // Calculate average
        };
      }
    );

    // Sort messages by timestamp
    aggregatedResults.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Send back all unique messages without pagination
    res.json({
      success: true,
      data: {
        topic: topicDocument.topic,
        messagesCount: aggregatedResults.length,
        messages: aggregatedResults,
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
