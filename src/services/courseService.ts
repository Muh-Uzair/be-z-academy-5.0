import { HydratedDocument, PipelineStage, Types } from "mongoose";
import { randomUUID } from "crypto";
import CourseModel, { CourseType } from "../models/courseModel";
import UserModel, { Role } from "../models/userModel";
import EnrollmentModel from "../models/enrollmentModel";
import TransactionModel from "../models/transactionModel";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import AppError from "../utils/appError";
import APIFeatures from "../utils/apiFeatures";
import {
  getPresignedPostUrlService,
  getPresignedGetUrlService,
  deleteS3ObjectService,
  buildS3ObjectKey,
} from "./s3Service";
import {
  excludeUserFields,
  excludeCategoryInternalFields,
} from "../utils/lookupProjections";
import {
  CreateCourseBody,
  UpdateCourseBody,
  UpdateCourseVerificationBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
} from "../types/courseType";
import { Pagination } from "../utils/sendResponse";
import {
  COURSE_MAX_VIDEO_SIZE_IN_BYTES,
  COURSE_MAX_IMAGE_SIZE_IN_BYTES,
  COURSE_THUMBNAIL_S3_FOLDER,
  COURSE_VIDEO_S3_FOLDER,
} from "../constants/courseConstant";
import { buildSlug, getOwnedCourseOrThrow } from "../utils/courseUtil";

interface CourseInstructorSummary {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  avatar: string | null;
}

interface CourseCategorySummary {
  _id: Types.ObjectId;
  name: string;
  description: string;
}

// Shape returned for a single course (create/details/update/verification) —
// the raw thumbnailKey/videoKey are replaced by their public/signed URLs.
type CourseWithUrls = Omit<CourseType, "thumbnailKey" | "videoKey"> & {
  thumbnailUrl: string;
  videoUrl: string;
};

// Shape returned for each item of the paginated list endpoint, where
// COURSE_LOOKUP_STAGES has already joined and replaced instructor/category
// ids with their public-safe *Details sub-documents.
type CourseAggregateItem = Omit<
  CourseType,
  "thumbnailKey" | "videoKey" | "instructor" | "category"
> & {
  thumbnailUrl: string;
  instructorDetails: CourseInstructorSummary;
  categoryDetails: CourseCategorySummary;
};

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
      // $lookup bypasses Mongoose's schema-level select:false / toJSON
      // transform, so the joined documents must be scrubbed explicitly here.
      ...excludeUserFields("instructorDetails"),
      ...excludeCategoryInternalFields("categoryDetails"),
    },
  },
];

// FUNCTION
export const createCoursePaymentIntentService = async (
  studentId: string,
  courseId: string,
): Promise<{ clientSecret: string | null }> => {
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

  if (
    !instructor ||
    !instructor.stripeAccountId ||
    !instructor.stripeOnboardingComplete
  ) {
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
// Accepts either a hydrated course document (create/details/update/verify)
// or an already-joined aggregate list item, and returns the same shape back
// with videoKey replaced by a freshly signed, time-limited videoUrl.
const withSignedVideoUrl = async (
  course: HydratedDocument<CourseType> | CourseAggregateItem,
): Promise<
  | CourseWithUrls
  | (Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string })
> => {
  // Step 1: Convert to a plain object (applies toJSON's thumbnailKey/videoKey cleanup)
  const isDocument =
    typeof (course as HydratedDocument<CourseType>).toJSON === "function";
  const plain = (
    isDocument ? (course as HydratedDocument<CourseType>).toJSON() : course
  ) as CourseType & Record<string, unknown>;

  // Step 2: Read the raw video key from whichever source still has it
  const videoKey =
    (plain.videoKey as string) ?? (course as CourseType).videoKey;

  // Step 3: Sign a time-limited GET URL for the private video
  const videoUrl = await getPresignedGetUrlService(videoKey);

  // Step 4: Strip the raw key and attach the signed URL
  const rest = { ...plain };
  Reflect.deleteProperty(rest, "videoKey");

  return { ...rest, videoUrl } as unknown as CourseWithUrls;
};

// FUNCTION
export const getCourseThumbnailUploadUrlService = async (
  body: UploadCourseThumbnailBody,
): Promise<{
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}> => {
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
): Promise<{
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}> => {
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
): Promise<CourseWithUrls> => {
  // Step 1: Create the course, tagging the owning instructor and a unique slug
  const course = await CourseModel.create({
    ...body,
    instructor: instructorId,
    slug: buildSlug(body.title),
  });

  // Step 2: Attach a signed video URL before returning
  return withSignedVideoUrl(course) as Promise<CourseWithUrls>;
};

// FUNCTION
export const getCoursesService = async (
  query: GetCoursesQuery,
  user: { id: string; role: string },
): Promise<{
  courses: Array<Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string }>;
  pagination: Pagination | null;
}> => {
  // Step 1: Build the base pipeline
  const basePipeline: PipelineStage[] = [{ $match: {} }];

  // Step 2 : Scope the result set by role — this endpoint requires auth
  // (route-level protect), so anonymous callers never reach here.
  if (user.role === Role.Admin) {
    // Admin sees all courses — no additional match stage needed
  }

  if (user.role === Role.Instructor) {
    basePipeline.push({
      $match: {
        instructor: new Types.ObjectId(user.id),
      },
    });
  }

  if (user.role === Role.Student) {
    // Students only see courses they're enrolled in (payment already
    // guarantees the course was verified at enrollment time).
    const enrolledCourseIds = await EnrollmentModel.distinct("course", {
      student: new Types.ObjectId(user.id),
    });

    basePipeline.push({
      $match: { _id: { $in: enrolledCourseIds } },
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

  // Step 4: Layer the query-driven filter, search, sort, lookup, projection, and pagination stages.
  // Cast the instructor id filter to ObjectId targeting the raw field so MongoDB
  // can use indexes before any lookups occur.
  const filterQuery = {
    ...query,
    instructor: query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
  };

  const { data, pagination } = await new APIFeatures(
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

  // The pipeline's $lookup/$project stages reshape each document into
  // CourseAggregateItem, which APIFeatures' generic Model<CourseType> can't
  // express — cast once at this boundary rather than losing type safety
  // everywhere downstream.
  const courses = data as unknown as CourseAggregateItem[];

  // Step 5: Attach a signed video URL to every course in the page
  const coursesWithVideoUrls = await Promise.all(
    courses.map(
      (course) =>
        withSignedVideoUrl(course) as Promise<
          Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string }
        >,
    ),
  );

  return {
    courses: coursesWithVideoUrls,
    pagination,
  };
};

// FUNCTION
// Runs COURSE_LOOKUP_STAGES against the given $match, returning the single
// joined course (or undefined if nothing matched).
const findCourseWithLookups = async (
  matchStage: Record<string, unknown>,
): Promise<CourseAggregateItem | undefined> => {
  const [course] = await CourseModel.aggregate([
    { $match: matchStage },
    ...COURSE_LOOKUP_STAGES,
  ]);

  return course;
};

// FUNCTION
export const getCourseDetailsService = async (
  id: string,
  user: { id: string; role: string },
): Promise<Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string }> => {
  // Step 1: Admin — full details for any course, including the joined
  // instructorDetails/categoryDetails, no ownership restriction.
  if (user.role === Role.Admin) {
    const course = await findCourseWithLookups({ _id: new Types.ObjectId(id) });

    if (!course) {
      throw new AppError(404, "Course not found");
    }

    return withSignedVideoUrl(course) as Promise<
      Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string }
    >;
  }

  // Step 2: Instructor — full details, but only for their own course
  if (user.role === Role.Instructor) {
    const course = await findCourseWithLookups({
      _id: new Types.ObjectId(id),
      instructor: new Types.ObjectId(user.id),
    });

    if (!course) {
      // Distinguish "course doesn't exist" from "exists but belongs to
      // another instructor", mirroring getOwnedCourseOrThrow's 404-vs-403.
      const exists = await CourseModel.exists({ _id: id });

      throw new AppError(
        exists ? 403 : 404,
        exists
          ? "You do not have permission to access this course"
          : "Course not found",
      );
    }

    return withSignedVideoUrl(course) as Promise<
      Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string }
    >;
  }

  // Step 3: Student — full details (including video), but only if enrolled
  const enrollment = await EnrollmentModel.findOne({
    student: user.id,
    course: id,
  });

  if (!enrollment) {
    throw new AppError(404, "You are not enrolled in this course");
  }

  const course = await findCourseWithLookups({ _id: new Types.ObjectId(id) });

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  return withSignedVideoUrl(course) as Promise<
    Omit<CourseAggregateItem, "videoKey"> & { videoUrl: string }
  >;
};

// FUNCTION
export const updateCourseService = async (
  id: string,
  instructorId: string,
  body: UpdateCourseBody,
): Promise<CourseWithUrls> => {
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
  return withSignedVideoUrl(updatedCourse!) as Promise<CourseWithUrls>;
};

// FUNCTION
export const updateCourseVerificationService = async (
  id: string,
  body: UpdateCourseVerificationBody,
): Promise<CourseWithUrls> => {
  // Step 1: Ensure the course exists
  const course = await CourseModel.findById(id);
  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Guard against redundant verify/unverify calls.
  // Approving only needs to check the course isn't already verified — a
  // previously-rejected course can always be approved (its rejection reason
  // is cleared below). Rejecting only needs to check it isn't already sitting
  // in a rejected state (isVerified: false with a rejection reason already
  // recorded) — a currently-verified course can always be rejected.
  if (body.isVerified && course.isVerified) {
    throw new AppError(400, "Course is already verified");
  }

  if (
    !body.isVerified &&
    !course.isVerified &&
    course.verificationRejectionReason !== null
  ) {
    throw new AppError(400, "Course is already unverified");
  }

  // Step 3: Update the course — approving clears any prior rejection
  // reason, rejecting tracks the rejection timestamp.
  const updatedCourse = await CourseModel.findByIdAndUpdate(
    id,
    {
      ...body,
      ...(body.isVerified
        ? { verificationRejectionReason: null }
        : { lastVerificationRejectedAt: new Date() }),
    },
    { new: true, runValidators: true },
  );

  // Step 4: Attach a signed video URL before returning
  return withSignedVideoUrl(updatedCourse!) as Promise<CourseWithUrls>;
};

// FUNCTION
export const deleteCourseService = async (
  id: string,
  instructorId: string,
): Promise<null> => {
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
): Promise<{ completionPercentage: number; completed: boolean }> => {
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
