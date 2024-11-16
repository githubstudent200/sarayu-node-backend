// mqttHandler.js
const awsIot = require("aws-iot-device-sdk");
const MessageModel = require("../models/mqtt-message-model");

let latestMessages = {}; // Store the latest live message per topic

// AWS IoT Core device configuration
const device = awsIot.device({
  keyPath: "./AWS_DATA_CERTIFICATES/Private.key",
  certPath: "./AWS_DATA_CERTIFICATES/device.crt",
  caPath: "./AWS_DATA_CERTIFICATES/AmazonRootCA1.pem",
  clientId: "503561454502",
  host: "a1uccysxn7j38q-ats.iot.ap-south-1.amazonaws.com",
});

device.on("connect", () => {
  console.log("Connected to AWS IoT");
});

device.on("message", async (topic, payload) => {
  try {
    const messageData = JSON.parse(payload.toString());
    const timestamp = new Date();
    // Save the latest message in-memory for quick access
    latestMessages[topic] = { message: messageData, timestamp };

    // Also save the message to MongoDB
    await MessageModel.findOneAndUpdate(
      { topic },
      { $push: { messages: { message: messageData, timestamp } } },
      { upsert: true, new: true }
    );
    console.log(messageData)
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

// Function to subscribe to topics dynamically
const subscribeToTopic = (topic) => {
  device.subscribe(topic, (err) => {
    if (err) {
      console.error(`Failed to subscribe to topic ${topic}`, err);
    } else {
      console.log(`Subscribed to topic ${topic}`);
    }
  });
};

// Function to get the latest live message from memory
const getLatestLiveMessage = (topic) => {
  return latestMessages[topic] || null;
};

module.exports = { subscribeToTopic, getLatestLiveMessage };
