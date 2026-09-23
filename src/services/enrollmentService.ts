import { PipelineStage, Types } from "mongoose";
import EnrollmentModel, { EnrollmentType } from "../models/enrollmentModel";
import { Role } from "../models/userModel";
import CourseModel, { CourseType } from "../models/courseModel";
import { TransactionType } from "../models/transactionModel";
import AppError from "../utils/appError";
import APIFeatures from "../utils/apiFeatures";
import { GetEnrollmentsQuery } from "../types/enrollmentType";
import { Pagination } from "../utils/sendResponse";
import { verifyEnrollmentAccessOrThrow } from "../utils/enrollmentUtil";
import { excludeUserFields } from "../utils/lookupProjections";
import { ENROLLMENT_WATCH_COMPLETION_THRESHOLD_PERCENTAGE } from "../constants/enrollmentConstant";
import { getPublicS3Url } from "./s3Service";
import { formatUserAvatarUrl } from "./userService";

interface EnrollmentUserSummary {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  avatarKey: string | null;
}

type EnrollmentCourseSummary = Omit<
  CourseType,
  "thumbnailKey" | "videoKey" | "instructor" | "category"
> & {
  thumbnailUrl: string;
};

type EnrollmentAggregateItem = Omit<
  EnrollmentListItem,
  "courseDetails"
> & {
  courseDetails: EnrollmentCourseSummary & { thumbnailKey: string };
};

// Shape of each enrollment once ENROLLMENT_LOOKUP_STAGES has joined and
// replaced student/course/instructor/transaction ids with public-safe
// *Details sub-documents.
export type EnrollmentListItem = Omit<
  EnrollmentType,
  "student" | "course" | "instructor" | "transaction"
> & {
  studentDetails: Omit<EnrollmentUserSummary, "avatarKey"> & { avatar: string | null };
  courseDetails: EnrollmentCourseSummary;
  instructorDetails: Omit<EnrollmentUserSummary, "avatarKey"> & { avatar: string | null };
  transactionDetails: TransactionType;
};

// Each reference is joined into a *Details field. The course thumbnail key is
// retained until the service converts it to a public URL after aggregation.
// The final $project drops the original ObjectId fields that are superseded
// by the joined documents, and scrubs sensitive fields that $lookup would
// otherwise pull in from the joined documents unfiltered.
const ENROLLMENT_LOOKUP_STAGES: PipelineStage[] = [
  {
    $lookup: {
      from: "users",
      localField: "student",
      foreignField: "_id",
      as: "studentDetails",
    },
  },
  { $unwind: { path: "$studentDetails", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "courses",
      localField: "course",
      foreignField: "_id",
      as: "courseDetails",
    },
  },
  { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "users",
      localField: "instructor",
      foreignField: "_id",
      as: "instructorDetails",
    },
  },
  { $unwind: { path: "$instructorDetails", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "transactions",
      localField: "transaction",
      foreignField: "_id",
      as: "transactionDetails",
    },
  },
  {
    $unwind: { path: "$transactionDetails", preserveNullAndEmptyArrays: true },
  },
  {
    $project: {
      student: 0,
      course: 0,
      instructor: 0,
      transaction: 0,
      ...excludeUserFields("studentDetails"),
      ...excludeUserFields("instructorDetails"),
      "courseDetails.videoKey": 0,
    },
  },
];

const withCourseThumbnailUrl = (
  enrollment: EnrollmentAggregateItem,
): EnrollmentListItem => {
  const { thumbnailKey, ...courseDetails } = enrollment.courseDetails;

  const formatted = { ...enrollment };
  if (formatted.studentDetails) formatted.studentDetails = formatUserAvatarUrl(formatted.studentDetails) as any;
  if (formatted.instructorDetails) formatted.instructorDetails = formatUserAvatarUrl(formatted.instructorDetails) as any;

  return {
    ...formatted,
    courseDetails: {
      ...courseDetails,
      thumbnailUrl: getPublicS3Url(thumbnailKey),
    },
  } as unknown as EnrollmentListItem;
};

// FUNCTION
export const getEnrollmentsService = async (
  query: GetEnrollmentsQuery,
  user: { userId: string; role: string },
): Promise<{
  enrollments: EnrollmentListItem[];
  pagination: Pagination | null;
}> => {
  // Step 1: Cast the reference id filters to ObjectId, targeting the raw
  // field names so MongoDB can use indexes before any lookups occur.
  const filterQuery = {
    ...query,
    student: query.student ? new Types.ObjectId(query.student) : undefined,
    course: query.course ? new Types.ObjectId(query.course) : undefined,
    instructor: query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
    transaction: query.transaction
      ? new Types.ObjectId(query.transaction)
      : undefined,
  };

  // Step 2: Scope results by role - admins see everything, instructors see
  // their own courses' enrollments, students see only their own.
  const basePipeline: PipelineStage[] = [];

  if (user.role === Role.Instructor) {
    basePipeline.push({
      $match: { instructor: new Types.ObjectId(user.userId) },
    });
  } else if (user.role === Role.Student) {
    basePipeline.push({ $match: { student: new Types.ObjectId(user.userId) } });

    if (query.continueWatching) {
      basePipeline.push({
        $match: {
          watchPercentage: { $gt: 0 },
        },
      });
    }
  }

  // Step 3: Layer the query-driven filter, sort, lookup, projection, and pagination stages.
  // By calling .addStages() AFTER .filter(), MongoDB's optimizer can use
  // indexes to dramatically reduce the dataset before performing expensive joins.
  const { data, pagination } = await new APIFeatures(
    EnrollmentModel,
    filterQuery,
    basePipeline,
  )
    .filter([
      "student",
      "course",
      "instructor",
      "transaction",
      "watchedCompletely",
      "certificateIssued",
    ])
    .sort()
    .addStages(ENROLLMENT_LOOKUP_STAGES)
    .projection()
    .paginate()
    .exec();

  // The pipeline's $lookup/$project stages reshape each document into
  // EnrollmentListItem, which APIFeatures' generic Model<EnrollmentType>
  // can't express — cast once at this boundary.
  const enrollments = (data as unknown as EnrollmentAggregateItem[]).map(
    withCourseThumbnailUrl,
  );

  return { enrollments, pagination };
};

// FUNCTION
export const getEnrollmentDetailsService = async (
  id: string,
  user: { userId: string; role: string },
): Promise<EnrollmentListItem> => {
  // Step 1: Fetch the enrollment with every reference joined in place
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...ENROLLMENT_LOOKUP_STAGES,
  ];

  const [enrollment] = (await EnrollmentModel.aggregate(
    pipeline,
  )) as EnrollmentAggregateItem[];

  if (!enrollment) {
    throw new AppError(404, "Enrollment not found");
  }

  // Step 2: Enforce ownership for non-admins
  verifyEnrollmentAccessOrThrow(enrollment, user);

  return withCourseThumbnailUrl(enrollment);
};

// FUNCTION
export const updateEnrollmentProgressService = async (
  id: string,
  lastPositionInSeconds: number,
  user: { userId: string; role: string },
): Promise<EnrollmentType> => {
  // Step 1: Fetch the raw enrollment (not the joined/read-only shape)
  const enrollment = await EnrollmentModel.findById(id);

  if (!enrollment) {
    throw new AppError(404, "Enrollment not found");
  }

  // Step 2: Only the enrolled student can report their own watch progress
  if (enrollment.student.toString() !== user.userId) {
    throw new AppError(
      403,
      "You do not have permission to update this enrollment's progress",
    );
  }

  // Step 3: Course duration is needed to convert the reported position into a percentage
  const course = await CourseModel.findById(enrollment.course);

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (course.totalDurationInMinutes <= 0) {
    throw new AppError(
      400,
      "This course has no duration set, so progress cannot be tracked",
    );
  }

  // Step 4: Track the furthest position ever reached, not the latest one -
  // rewinding to rewatch a part shouldn't lower progress already earned, and
  // seeking past the course duration shouldn't push it above 100%.
  const reportedPositionInMinutes = Math.min(
    lastPositionInSeconds / 60,
    course.totalDurationInMinutes,
  );

  enrollment.totalDurationWatchedInMinutes = Number(
    Math.max(
      enrollment.totalDurationWatchedInMinutes,
      reportedPositionInMinutes,
    ).toFixed(2),
  );

  enrollment.watchPercentage = Number(
    Math.min(
      100,
      (enrollment.totalDurationWatchedInMinutes /
        course.totalDurationInMinutes) *
        100,
    ).toFixed(2),
  );

  // Step 5: Grant completion once, the first time the threshold is crossed
  if (
    !enrollment.watchedCompletely &&
    enrollment.watchPercentage >=
      ENROLLMENT_WATCH_COMPLETION_THRESHOLD_PERCENTAGE
  ) {
    enrollment.watchedCompletely = true;
    enrollment.watchedCompletelyAt = new Date();
  }

  enrollment.mostRecentlySeen = true;
  await enrollment.save();

  // Step 6: Only one enrollment per student can be "most recently seen"
  await EnrollmentModel.updateMany(
    { student: user.userId, _id: { $ne: enrollment._id } },
    { $set: { mostRecentlySeen: false } },
  );

  return enrollment;
};
