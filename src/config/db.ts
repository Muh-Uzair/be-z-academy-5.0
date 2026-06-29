import mongoose from "mongoose";
import { env } from "@src/config/env";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.DB_CONNECTION_STRING, {
      family: 4,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Exit process with failure
  }
};
