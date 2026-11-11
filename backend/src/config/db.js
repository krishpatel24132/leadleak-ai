
import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
  try {
    // Local development only: use the DNS resolver working on your network.
    // In production, use the cloud server's default DNS.
    if (process.env.NODE_ENV !== "production") {
      dns.setServers(["10.216.33.48"]);
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    console.log("Connecting to MongoDB Atlas...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 15000,
    });

    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
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
