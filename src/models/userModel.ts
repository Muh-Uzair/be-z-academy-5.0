import { model, models, Schema, type InferSchemaType } from "mongoose";

enum Role {
  Admin = "admin",
  Instructor = "instructor",
  Student = "student",
}

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: null,
    },
    highestEducation: {
      type: String,
      required: [true, "Highest education is required"],
      trim: true,
      maxlength: [150, "Highest education cannot exceed 150 characters"],
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: [0, "Years of experience cannot be negative"],
      max: [60, "Years of experience cannot exceed 60"],
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
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },
    otp: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) => value === null || /^\d{6}$/.test(value),
        message: "OTP must be exactly 6 digits",
      },
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: Object.values(Role),
        message: "Role must be one of: admin, instructor, student",
      },
    },
  },
  {
    timestamps: true,
  },
);

type UserType = InferSchemaType<typeof userSchema>;

const UserModel = models.User || model<UserType>("User", userSchema);

export default UserModel;
export type { UserType };
export { Role };
