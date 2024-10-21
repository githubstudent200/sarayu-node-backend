const mongoose = require("mongoose");
require("dotenv").config(); // Ensure this is at the top of your main server file

const connectDB = async () => {
  try {
    console.log("Connecting to database at:", process.env.DATABASE_URL); // Log the URL
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Database connection failed!", error);
    process.exit(1);
  }
};

module.exports = connectDB;
