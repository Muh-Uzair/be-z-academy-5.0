import { model, models, Schema, type InferSchemaType } from "mongoose";
import {
  USER_FULL_NAME_MIN_LENGTH,
  USER_FULL_NAME_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
  USER_BIO_MAX_LENGTH,
  USER_HIGHEST_EDUCATION_MAX_LENGTH,
  USER_YEARS_OF_EXPERIENCE_MIN,
  USER_YEARS_OF_EXPERIENCE_MAX,
  USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH,
} from "@src/constants/userConstant";

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
      minlength: [
        USER_FULL_NAME_MIN_LENGTH,
        `Full name must be at least ${USER_FULL_NAME_MIN_LENGTH} characters`,
      ],
      maxlength: [
        USER_FULL_NAME_MAX_LENGTH,
        `Full name cannot exceed ${USER_FULL_NAME_MAX_LENGTH} characters`,
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [
        USER_PASSWORD_MIN_LENGTH,
        `Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters`,
      ],
      select: false,
    },
    bio: {
      type: String,
      required: [true, "Bio is required"],
      trim: true,
      maxlength: [
        USER_BIO_MAX_LENGTH,
        `Bio cannot exceed ${USER_BIO_MAX_LENGTH} characters`,
      ],
    },
    highestEducation: {
      type: String,
      required: [true, "Highest education is required"],
      trim: true,
      maxlength: [
        USER_HIGHEST_EDUCATION_MAX_LENGTH,
        `Highest education cannot exceed ${USER_HIGHEST_EDUCATION_MAX_LENGTH} characters`,
      ],
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: [
        USER_YEARS_OF_EXPERIENCE_MIN,
        "Years of experience cannot be negative",
      ],
      max: [
        USER_YEARS_OF_EXPERIENCE_MAX,
        `Years of experience cannot exceed ${USER_YEARS_OF_EXPERIENCE_MAX}`,
      ],
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
      maxlength: [
        USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH,
        `Rejection reason cannot exceed ${USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH} characters`,
      ],
    },
    lastVerificationRejectedAt: {
      type: Date,
      default: null,
    },
    otp: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null || /^\d{6}$/.test(value),
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
    stripeAccountId: {
      type: String,
      default: null,
      trim: true,
    },
    stripeOnboardingComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes to support APIFeatures role-scoping, query filtering, and default sorting.
// email already has an index from unique: true on the schema field.
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });

type UserType = InferSchemaType<typeof userSchema>;

const UserModel = models.User || model<UserType>("User", userSchema);

export default UserModel;
export type { UserType };
export { Role };
