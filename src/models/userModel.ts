import { model, models, Schema, type InferSchemaType } from "mongoose";

// Define the Role enum
enum Role {
  Admin = "admin",
  Instructor = "instructor",
  Student = "student",
}

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
      trim: true,
    },
    highestEducation: {
      type: String,
      required: true,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      required: false,
      default: 0,
    },
    avatar: {
      type: String,
      default: null,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationRejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(Role), // Restrict to enum values
    },
  },
  {
    timestamps: true,
  },
);

type UserType = InferSchemaType<typeof userSchema>;

const UserModel = models.User || model<UserType>("User", userSchema);

export default UserModel;
export type { UserType, Role }; // Export Role so you can reuse it
