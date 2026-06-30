import { SignupBody, VerifyOtpBody, ResendOtpBody } from "@src/types/authTypes";
import AppError from "@src/utils/appError";
import UserModel from "@src/models/userModel";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@src/utils/email";

export const signupService = async (body: SignupBody): Promise<any> => {
  // 1. Check if email already exists
  const existingUser = await UserModel.findOne({ email: body.email });
  if (existingUser) {
    throw new AppError(400, "Email already in use");
  }

  // 2. Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(body.password, salt);

  // 3. Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 4. Calculate OTP expiry (10 minutes from now)
  // const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  const otpExpires = new Date(Date.now() + 10 * 1000);

  // 5. Create user
  await UserModel.create({
    ...body,
    password: hashedPassword,
    otp,
    otpExpires,
  });

  // 6. Send OTP via email
  await sendOtpEmail({
    email: body.email,
    otp,
    fullName: body.fullName,
  });

  return null;
};

export const verifyOtpService = async (body: VerifyOtpBody): Promise<any> => {
  // 1. Find user by email
  const user = await UserModel.findOne({ email: body.email });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  // 2. Check if already verified
  if (user.isVerified) {
    throw new AppError(400, "Account is already verified");
  }

  // 3. Verify OTP
  if (user.otp !== body.otp) {
    throw new AppError(400, "Invalid OTP");
  }

  // 4. Check if OTP is expired
  if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
    throw new AppError(400, "OTP has expired");
  }

  // 5. Mark user as verified and clear OTP fields
  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  return null;
};

export const resendOtpService = async (body: ResendOtpBody): Promise<any> => {
  // 1. Find user by email
  const user = await UserModel.findOne({ email: body.email });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  // 2. Check if already verified
  if (user.isVerified) {
    throw new AppError(400, "Account is already verified");
  }

  // 3. Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 4. Calculate OTP expiry (10 minutes from now)
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  // 5. Update user
  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  // 6. Send OTP via email
  await sendOtpEmail({
    email: user.email,
    otp,
    fullName: user.fullName,
  });

  return null;
};
