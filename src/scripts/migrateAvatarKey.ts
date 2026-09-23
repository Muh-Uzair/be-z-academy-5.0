import mongoose from "mongoose";
import "dotenv/config";
import UserModel from "../models/userModel";
import { connectDB } from "../config/db";

const migrateAvatarKey = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    const result = await UserModel.updateMany(
      { avatar: { $exists: true } },
      { $rename: { avatar: "avatarKey" } }
    );

    console.log(`Migration successful! Modified ${result.modifiedCount} documents.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

migrateAvatarKey();
