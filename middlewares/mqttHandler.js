// mqttHandler.js
const awsIot = require("aws-iot-device-sdk");
const MessageModel = require("../models/mqtt-message-model");

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
  // Subscribe to a base topic if needed
});

device.on("message", async (topic, payload) => {
  try {
    console.log(`Message received on topic ${topic}: ${payload.toString()}`);
    const messageData = JSON.parse(payload.toString());
    await MessageModel.findOneAndUpdate(
      { topic },
      { $push: { messages: { message: messageData, timestamp: new Date() } } },
      { upsert: true, new: true }
    );
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

// Function to get the latest message from a specific user/topic
const getLatestMessage = async (topic) => {
  const topicData = await MessageModel.findOne({ topic });
  if (topicData && topicData.messages.length > 0) {
    return topicData.messages[topicData.messages.length - 1];
  }
  return null;
};

module.exports = { subscribeToTopic, getLatestMessage };
