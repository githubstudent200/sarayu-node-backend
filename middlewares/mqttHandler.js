const awsIot = require("aws-iot-device-sdk");
const connectDB = require("../env/db");
const MessageModel = require("../models/mqtt-message-model");

// MongoDB Connection
connectDB();

// Store devices per user
let devices = {}; // Use this to store devices keyed by user email or MQTT topic

function subscribeToDevice(user, subscribeSubject) {
  let messageBuffer = [];

  if (!devices[user.email]) {
    // AWS IoT setup for the specific user
    const device = awsIot.device({
      keyPath: "./AWS_DATA_CERTIFICATES/Private.key",
      certPath:
        "./AWS_DATA_CERTIFICATES/f6430d76618b84f629991c4ad047a64d82867ca67bd9de2a81999b61f8ebc496-certificate.pem.crt",
      caPath: "./AWS_DATA_CERTIFICATES/AmazonRootCA1.pem",
      clientId: "503561454502-" + user.email, // unique clientId for each user
      host: "a1uccysxn7j38q-ats.iot.us-east-1.amazonaws.com",
    });

    devices[user.email] = { device, messageBuffer }; // Store the device and buffer

    device.on("connect", function () {
      console.log(`Connected to AWS IoT as user: ${user.email}`);
      device.subscribe(subscribeSubject, function (err, granted) {
        if (err) {
          console.error(`Failed to subscribe for ${user.email}:`, err);
        } else {
          console.log(`${user.email} subscribed to topic:`, granted);
        }
      });
    });

    device.on("message", function (topic, payload) {
      const latestMessage = {
        topic,
        message: payload.toString(),
        timestamp: new Date(),
      };

      devices[user.email].messageBuffer.push(latestMessage);
      console.log(`Received message for ${user.email}:`, latestMessage);
    });

    // Periodically save message buffer to MongoDB every minute for this user
    setInterval(async () => {
      if (devices[user.email].messageBuffer.length > 0) {
        const messageBuffer = devices[user.email].messageBuffer;
        console.log(
          `Attempting to append ${messageBuffer.length} messages for ${user.email} to MongoDB`
        );

        const topic = messageBuffer[0]
          ? messageBuffer[0].topic
          : subscribeSubject;

        try {
          await MessageModel.updateOne(
            { topic },
            { $push: { messages: { $each: messageBuffer } }, topic },
            { upsert: true }
          );

          console.log(
            `Appended ${messageBuffer.length} messages for ${user.email} to MongoDB`
          );

          // Clear the buffer after successfully appending messages
          devices[user.email].messageBuffer = [];
        } catch (err) {
          console.error(
            `Error appending messages to MongoDB for ${user.email}:`,
            err
          );
        }
      } else {
        console.log(`No messages to append for ${user.email} in this interval`);
      }
    }, 1 * 60 * 1000); // Append messages every 1 minute
  }
}

const getLatestMessage = (user) => {
  // Ensure the user is passed and exists in devices
  if (!user || !devices[user.email]) {
    return null;
  }
  const deviceInfo = devices[user.email];
  if (deviceInfo.messageBuffer.length === 0) {
    return null;
  }
  return deviceInfo.messageBuffer[deviceInfo.messageBuffer.length - 1];
};

module.exports = {
  subscribeToDevice,
  getLatestMessage,
};
