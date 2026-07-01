import {
  SignupBody,
  VerifyOtpBody,
  ResendOtpBody,
  SigninBody,
} from "@src/types/authTypes";
import AppError from "@src/utils/appError";
import UserModel from "@src/models/userModel";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@src/utils/email";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@src/utils/jwt";

export const signupService = async (body: SignupBody): Promise<any> => {
  // 1. Check if email already exists
  const existingUser = await UserModel.findOne({ email: body.email });
  if (existingUser) {
    throw new AppError(400, "Email already in use");
  }

  // 2. Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(body.password, salt);

  // 3. Instructors are verified by Admin, not by OTP
  if (body.role === "instructor") {
    await UserModel.create({
      ...body,
      password: hashedPassword,
    });

    return null;
  }

  // 4. Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 5. Calculate OTP expiry (10 minutes from now)
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  // 6. Create user
  await UserModel.create({
    ...body,
    password: hashedPassword,
    otp,
    otpExpires,
  });

  // 7. Send OTP via email
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

export const signinService = async (body: SigninBody): Promise<any> => {
  // 1. Find user by email
  const user = await UserModel.findOne({ email: body.email });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  // 2. Check password
  const isPasswordCorrect = await bcrypt.compare(body.password, user.password);
  if (!isPasswordCorrect) {
    throw new AppError(401, "Invalid email or password");
  }

  // 3. Check if account is verified
  if (!user.isVerified) {
    const message =
      user.role === "instructor"
        ? "Your account is pending Admin approval"
        : "Please verify your account before signing in";
    throw new AppError(403, message);
  }

  // 4. Issue tokens
  const payload = { id: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { accessToken, refreshToken };
};

export const rotateTokenService = async (
  refreshToken: string | undefined,
): Promise<any> => {
  // 1. Ensure refresh token was provided
  if (!refreshToken) {
    throw new AppError(401, "Refresh token is missing");
  }

  // 2. Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  // 3. Ensure user still exists
  const user = await UserModel.findById(decoded.id);
  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  // 4. Issue new access and refresh tokens
  const payload = { id: user._id.toString(), role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};
