const awsIot = require("aws-iot-device-sdk");
const connectDB = require("../env/db");
const MessageModel = require("../models/mqtt-message-model");

// MongoDB Connection
connectDB();

let device; // Declare device as a global variable to use across the function
let latestMessage = null; // Move this outside of the function to maintain the global scope

function subscribeToDevice(subscribeSubject) {
  let messageBuffer = [];

  if (!device) {
    // AWS IoT setup
    device = awsIot.device({
      keyPath: "./AWS_DATA_CERTIFICATES/Private.key",
      certPath:
        "./AWS_DATA_CERTIFICATES/f6430d76618b84f629991c4ad047a64d82867ca67bd9de2a81999b61f8ebc496-certificate.pem.crt",
      caPath: "./AWS_DATA_CERTIFICATES/AmazonRootCA1.pem",
      clientId: "503561454502",
      host: "a1uccysxn7j38q-ats.iot.us-east-1.amazonaws.com",
    });

    device.on("connect", function () {
      console.log("Connected to AWS IoT");
      device.subscribe(subscribeSubject, function (err, granted) {
        if (err) {
          console.error("Failed to subscribe:", err);
        } else {
          console.log("Subscribed to topic:", granted);
        }
      });
    });

    device.on("message", function (topic, payload) {
      latestMessage = {
        topic,
        message: payload.toString(),
        timestamp: new Date(),
      };

      messageBuffer.push(latestMessage);
      console.log("Received message and added to buffer:", latestMessage);
    });

    // Periodically save message buffer to MongoDB every minute
    setInterval(async () => {
      if (messageBuffer.length > 0) {
        console.log(
          `Attempting to append ${messageBuffer.length} messages to the existing document in MongoDB`
        );

        const topic = latestMessage ? latestMessage.topic : "default_topic";

        try {
          await MessageModel.updateOne(
            { topic },
            { $push: { messages: { $each: messageBuffer } }, topic },
            { upsert: true }
          );

          console.log(
            `Appended ${messageBuffer.length} messages to the existing document in MongoDB`
          );

          // Clear the buffer after successfully appending messages
          messageBuffer = [];
        } catch (err) {
          console.error("Error appending messages to MongoDB:", err);
        }
      } else {
        console.log("No messages to append in this interval");
      }
    }, 1 * 60 * 1000); // Append messages every 1 minute
  }
}

// Function to get the latest received message
const getLatestMessage = () => {
  if (!latestMessage) {
    return { success: false, error: "No messages received yet" };
  }
  return latestMessage;
};

module.exports = {
  subscribeToDevice,
  getLatestMessage,
};
