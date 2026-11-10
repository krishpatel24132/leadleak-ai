
import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
  try {
    // Use Google DNS
    dns.setServers(["8.8.8.8", "8.8.4.4"]);

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    console.log("Connecting to MongoDB Atlas...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 15000,
      family: 4,
    });

    console.log(
      `MongoDB Connected: ${mongoose.connection.host}`
    );

  } catch (error) {
    console.error("MongoDB Connection Failed!");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);

    if (error.cause) {
      console.error("Error Cause:", error.cause.message);
    }

    throw error;
  }
};

export default connectDB;
