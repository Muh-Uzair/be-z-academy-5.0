import { PipelineStage, Types } from "mongoose";
import { randomUUID } from "crypto";
import CourseModel from "@src/models/courseModel";
import UserModel, { Role } from "@src/models/userModel";
import EnrollmentModel from "@src/models/enrollmentModel";
import TransactionModel from "@src/models/transactionModel";
import { stripe } from "@src/config/stripe";
import { env } from "@src/config/env";
import AppError from "@src/utils/appError";
import APIFeatures from "@src/utils/apiFeatures";
import {
  getPresignedPostUrlService,
  getPresignedGetUrlService,
  deleteS3ObjectService,
  buildS3ObjectKey,
} from "@src/services/s3Service";
import {
  CreateCourseBody,
  UpdateCourseBody,
  UpdateCourseVerificationBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
} from "@src/types/courseType";
import {
  COURSE_MAX_VIDEO_SIZE_IN_BYTES,
  COURSE_MAX_IMAGE_SIZE_IN_BYTES,
  COURSE_THUMBNAIL_S3_FOLDER,
  COURSE_VIDEO_S3_FOLDER,
} from "@src/constants/courseConstant";
import { buildSlug, getOwnedCourseOrThrow } from "@src/utils/courseUtil";

// FUNCTION
export const createCoursePaymentIntentService = async (
  studentId: string,
  courseId: string,
): Promise<any> => {
  // Step 1: Ensure the course exists and is verified/live
  const course = await CourseModel.findOne({
    _id: courseId,
    isVerified: true,
  });

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Ensure the student is not already enrolled in this course
  const existingEnrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
  });

  if (existingEnrollment) {
    throw new AppError(400, "You are already enrolled in this course");
  }

  // Step 3: Ensure the course's instructor has completed Stripe onboarding
  const instructor = await UserModel.findOne({
    _id: course.instructor,
    role: Role.Instructor,
  });

  if (!instructor || !instructor.stripeAccountId || !instructor.stripeOnboardingComplete) {
    throw new AppError(
      400,
      "This course's instructor has not completed payment onboarding yet",
    );
  }

  // Step 4: Calculate the admin commission and instructor revenue split
  const amountInCents = Math.round(course.price * 100);
  const adminCommission = Math.round(
    (amountInCents * env.PLATFORM_COMMISSION_PERCENTAGE) / 100,
  );

  // Step 5: Create a Stripe PaymentIntent on the platform account with
  // transfer_data.destination set to the instructor's connected account and
  // application_fee_amount set to the admin's commission cut
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    application_fee_amount: adminCommission,
    transfer_data: {
      destination: instructor.stripeAccountId,
    },
    metadata: {
      courseId: courseId, // Used parameter instead of course.id
      studentId,
      instructorId: instructor.id,
    },
  });

  // Step 6: Return the client secret (and any other data the browser needs
  // to confirm the payment) to the controller
  return { clientSecret: paymentIntent.client_secret };
};

// FUNCTION
const withSignedVideoUrl = async (course: any): Promise<any> => {
  // Step 1: Convert to a plain object (applies toJSON's thumbnailKey/videoKey cleanup)
  const plain = typeof course.toJSON === "function" ? course.toJSON() : course;

  // Step 2: Read the raw video key from whichever source still has it
  const videoKey = plain.videoKey ?? course.videoKey;

  // Step 3: Sign a time-limited GET URL for the private video
  const videoUrl = await getPresignedGetUrlService(videoKey);

  // Step 4: Strip the raw key and attach the signed URL
  delete plain.videoKey;

  return { ...plain, videoUrl };
};

// FUNCTION
export const getCourseThumbnailUploadUrlService = async (
  body: UploadCourseThumbnailBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the thumbnail, with the correct extension
  const key = buildS3ObjectKey(
    COURSE_THUMBNAIL_S3_FOLDER,
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max image size
  return getPresignedPostUrlService(
    key,
    body.fileType,
    COURSE_MAX_IMAGE_SIZE_IN_BYTES,
  );
};

// FUNCTION
export const getCourseVideoUploadUrlService = async (
  body: UploadCourseVideoBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the video, with the correct extension
  const key = buildS3ObjectKey(
    COURSE_VIDEO_S3_FOLDER,
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max video size
  return getPresignedPostUrlService(
    key,
    body.fileType,
    COURSE_MAX_VIDEO_SIZE_IN_BYTES,
  );
};

// FUNCTION
export const createCourseService = async (
  instructorId: string,
  body: CreateCourseBody,
): Promise<any> => {
  // Step 1: Create the course, tagging the owning instructor and a unique slug
  const course = await CourseModel.create({
    ...body,
    instructor: instructorId,
    slug: buildSlug(body.title),
  });

  // Step 2: Attach a signed video URL before returning
  return withSignedVideoUrl(course);
};

// FUNCTION
export const getCoursesService = async (
  query: GetCoursesQuery,
  user?: { id: string; role: string },
): Promise<any> => {
  // Step 1: Build the base pipeline
  const basePipeline: PipelineStage[] = [{ $match: {} }];

  // Step 2 : Deal with roles
  const role = user?.role;

  // making changes according to admin
  if (role && role === Role.Admin && user.id) {
    // Admin sees all courses — no additional match stage needed
  }

  // making changes according to instructor
  if (role && role === Role.Instructor && user.id) {
    basePipeline.push({
      $match: {
        instructor: new Types.ObjectId(user.id),
      },
    });
  }

  // making changes according to student
  if (role && role === Role.Student && user.id) {
    basePipeline.push({
      $match: { isVerified: true, verificationRejectionReason: null },
    });
  }

  // making changes according to unauthenticated users
  if (!role) {
    basePipeline.push({
      $match: { isVerified: true, verificationRejectionReason: null },
    });
  }

  // Step 3 : Apply optional verificationRejectionReason filter
  // (a literal-null query filter, so the generic .filter() below can't
  // express it - that method skips null values on purpose)
  if (query.verificationRejectionReason === null) {
    basePipeline.push({
      $match: {
        verificationRejectionReason: null,
      },
    });
  }

  const COURSE_LOOKUP_STAGES: PipelineStage[] = [
    {
      $lookup: {
        from: "users",
        localField: "instructor",
        foreignField: "_id",
        as: "instructorDetails",
      },
    },
    {
      $unwind: {
        path: "$instructorDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        instructor: 0,
        category: 0,
      },
    },
  ];

  // Step 4: Layer the query-driven filter, search, sort, lookup, projection, and pagination stages.
  // Cast the instructor id filter to ObjectId targeting the raw field so MongoDB
  // can use indexes before any lookups occur.
  const filterQuery = {
    ...query,
    instructor: query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
  };

  const { data: courses, pagination } = await new APIFeatures(
    CourseModel,
    filterQuery,
    basePipeline,
  )
    .filter(["isVerified", "instructor"])
    .search(["title"])
    .sort()
    .addStages(COURSE_LOOKUP_STAGES)
    .projection()
    .paginate()
    .exec();

  // Step 5: Attach a signed video URL to every course in the page
  const coursesWithVideoUrls = await Promise.all(
    courses.map((course) => withSignedVideoUrl(course)),
  );

  return {
    courses: coursesWithVideoUrls,
    pagination,
  };
};

// FUNCTION
export const getCourseDetailsService = async (id: string): Promise<any> => {
  // Step 1: Fetch the course by id
  const course = await CourseModel.findById(id);

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Attach a signed video URL before returning
  return withSignedVideoUrl(course);
};

// FUNCTION
export const updateCourseService = async (
  id: string,
  instructorId: string,
  body: UpdateCourseBody,
): Promise<any> => {
  // Step 1: Fetch the existing course, enforcing ownership, and capture its current keys
  const existingCourse = await getOwnedCourseOrThrow(id, instructorId);

  const previousThumbnailKey = existingCourse.thumbnailKey;
  const previousVideoKey = existingCourse.videoKey;

  // Step 2: Apply the update
  const updatedCourse = await CourseModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  // Step 3: Collect any S3 keys that were replaced by this update
  const staleKeys: string[] = [];

  if (body.thumbnailKey && body.thumbnailKey !== previousThumbnailKey) {
    staleKeys.push(previousThumbnailKey);
  }

  if (body.videoKey && body.videoKey !== previousVideoKey) {
    staleKeys.push(previousVideoKey);
  }

  // Step 4: Delete the now-orphaned S3 objects
  await Promise.all(staleKeys.map((key) => deleteS3ObjectService(key)));

  // Step 5: Attach a signed video URL before returning
  return withSignedVideoUrl(updatedCourse);
};

// FUNCTION
export const updateCourseVerificationService = async (
  id: string,
  body: UpdateCourseVerificationBody,
): Promise<any> => {
  // Step 1: Ensure the course exists
  const course = await CourseModel.findById(id);
  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Guard against redundant verify/unverify calls
  if (course.isVerified === body.isVerified) {
    const message = body.isVerified
      ? "Course is already verified"
      : "Course is already unverified";
    throw new AppError(400, message);
  }

  // Step 3: Update the course, tracking the rejection timestamp when rejecting
  const updatedCourse = await CourseModel.findByIdAndUpdate(
    id,
    {
      ...body,
      ...(body.isVerified ? {} : { lastVerificationRejectedAt: new Date() }),
    },
    { new: true, runValidators: true },
  );

  // Step 4: Attach a signed video URL before returning
  return withSignedVideoUrl(updatedCourse);
};

// FUNCTION
export const deleteCourseService = async (
  id: string,
  instructorId: string,
): Promise<any> => {
  // Step 1: Fetch the course, enforcing ownership
  const course = await getOwnedCourseOrThrow(id, instructorId);

  // Step 2: Delete the course document
  await course.deleteOne();

  // Step 3: Delete the now-orphaned thumbnail and video from S3
  await Promise.all([
    deleteS3ObjectService(course.thumbnailKey),
    deleteS3ObjectService(course.videoKey),
  ]);

  return null;
};

// FUNCTION
export const requestCourseRefundService = async (
  studentId: string,
  courseId: string,
): Promise<void> => {
  // Step 1: Find the enrollment to confirm the student is enrolled
  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
  });

  if (!enrollment) {
    throw new AppError(404, "You are not enrolled in this course");
  }

  // Step 2: Find the linked transaction
  const transaction = await TransactionModel.findById(enrollment.transaction);

  if (!transaction) {
    throw new AppError(404, "No payment record found for this enrollment");
  }

  // Step 3: Ensure the transaction is in a refundable state (paid)
  if (transaction.paymentStatus !== "paid") {
    throw new AppError(
      400,
      transaction.paymentStatus === "refunded"
        ? "This course has already been refunded"
        : "This payment is not eligible for a refund",
    );
  }

  // Step 4: Enforce the 7-day refund window
  const REFUND_WINDOW_DAYS = 7;
  const now = new Date();
  const paidAt = new Date(transaction.amountPaidAt as Date);
  const daysSincePurchase =
    (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePurchase > REFUND_WINDOW_DAYS) {
    throw new AppError(
      400,
      `Refund window has expired. Refunds are only allowed within ${REFUND_WINDOW_DAYS} days of purchase`,
    );
  }

  // Step 5: Ensure the student hasn't watched too much of the course (>30%)
  if (enrollment.watchPercentage > 30) {
    throw new AppError(
      400,
      "You have watched more than 30% of the course and are no longer eligible for a refund",
    );
  }

  // Step 6: The stripeChargeId is required to issue a refund
  if (!transaction.stripeChargeId) {
    throw new AppError(
      500,
      "Unable to process refund: no charge reference found",
    );
  }

  // Step 7: Call Stripe to issue the refund.
  // - reverse_transfer: true  → pulls the 95% back from the instructor's connected account
  // - refund_application_fee: true → pulls the 5% admin commission back from the platform balance
  // Together, the student receives 100% back to their card.
  await stripe.refunds.create({
    charge: transaction.stripeChargeId,
    reverse_transfer: true,
    refund_application_fee: true,
  });

  // Note: We do NOT update the DB here.
  // The DB update (marking transaction as 'refunded' and removing enrollment)
  // happens in the 'charge.refunded' webhook handler to guarantee consistency.
};

// FUNCTION
export const getCourseCompletionStatusService = async (
  studentId: string,
  courseId: string,
): Promise<any> => {
  // Step 1: Find the enrollment for the student in this course
  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
  });

  if (!enrollment) {
    throw new AppError(404, "You are not enrolled in this course");
  }

  // Step 2: Return completion status and percentage
  return {
    completionPercentage: enrollment.watchPercentage,
    completed: enrollment.watchedCompletely,
  };
};
