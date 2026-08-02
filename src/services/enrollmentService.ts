import { PipelineStage, Types } from "mongoose";
import EnrollmentModel from "@src/models/enrollmentModel";
import { Role } from "@src/models/userModel";
import AppError from "@src/utils/appError";
import APIFeatures from "@src/utils/apiFeatures";
import { GetEnrollmentsQuery } from "@src/types/enrollmentType";
import { verifyEnrollmentAccessOrThrow } from "@src/utils/enrollmentUtil";

// Each reference is joined into a *Details field so the response shape is
// already correct without any post-processing mapper.
// The final $project drops the original ObjectId fields that are superseded
// by the joined documents.
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
  { $unwind: { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
  { $project: { student: 0, course: 0, instructor: 0, transaction: 0 } },
];

// FUNCTION
export const getEnrollmentsService = async (
  query: GetEnrollmentsQuery,
  user: { id: string; role: string },
): Promise<any> => {
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
      $match: { instructor: new Types.ObjectId(user.id) },
    });
  } else if (user.role === Role.Student) {
    basePipeline.push({ $match: { student: new Types.ObjectId(user.id) } });
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

  return { enrollments: data, pagination };
};

// FUNCTION
export const getEnrollmentDetailsService = async (
  id: string,
  user: { id: string; role: string },
): Promise<any> => {
  // Step 1: Fetch the enrollment with every reference joined in place
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...ENROLLMENT_LOOKUP_STAGES,
  ];

  const [enrollment] = await EnrollmentModel.aggregate(pipeline);

  if (!enrollment) {
    throw new AppError(404, "Enrollment not found");
  }

  // Step 2: Enforce ownership for non-admins
  verifyEnrollmentAccessOrThrow(enrollment, user);

  return enrollment;
};
