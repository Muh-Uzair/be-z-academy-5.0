import { PipelineStage, Types } from "mongoose";
import EnrollmentModel from "@src/models/enrollmentModel";
import { Role } from "@src/models/userModel";
import AppError from "@src/utils/appError";
import APIFeatures from "@src/utils/apiFeatures";
import { GetEnrollmentsQuery } from "@src/types/enrollmentTypes";

// Every reference is joined in place (lookup `as` reuses the original field
// name), so the raw ObjectId is replaced with the nested document at that
// same key. This is what lets query filters target e.g. "course._id".
const ENROLLMENT_LOOKUP_STAGES: PipelineStage[] = [
  {
    $lookup: {
      from: "users",
      localField: "student",
      foreignField: "_id",
      as: "student",
    },
  },
  { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "courses",
      localField: "course",
      foreignField: "_id",
      as: "course",
    },
  },
  { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "users",
      localField: "instructor",
      foreignField: "_id",
      as: "instructor",
    },
  },
  { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "transactions",
      localField: "transaction",
      foreignField: "_id",
      as: "transaction",
    },
  },
  { $unwind: { path: "$transaction", preserveNullAndEmptyArrays: true } },
];

// Renames the now-joined reference fields to *Details for the response, so
// callers get e.g. courseDetails: {} instead of course: "<mongo id>".
const toEnrollmentDetails = (doc: any) => {
  const { student, course, instructor, transaction, ...rest } = doc;
  return {
    ...rest,
    studentDetails: student,
    courseDetails: course,
    instructorDetails: instructor,
    transactionDetails: transaction,
  };
};

// FUNCTION
export const getEnrollmentsService = async (
  query: GetEnrollmentsQuery,
  user: { id: string; role: string },
): Promise<any> => {
  // Step 1: The reference filters need ObjectId casting. Since the base
  // pipeline joins them in place under the same field name, they must be
  // matched by their nested _id rather than the (now-gone) raw id field.
  const filterQuery = {
    ...query,
    "student._id": query.student
      ? new Types.ObjectId(query.student)
      : undefined,
    "course._id": query.course ? new Types.ObjectId(query.course) : undefined,
    "instructor._id": query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
    "transaction._id": query.transaction
      ? new Types.ObjectId(query.transaction)
      : undefined,
  };

  // Step 2: Scope results by role - admins see everything, instructors see
  // their own courses' enrollments, students see only their own
  const basePipeline: PipelineStage[] = [];

  if (user.role === Role.Instructor) {
    basePipeline.push({
      $match: { instructor: new Types.ObjectId(user.id) },
    });
  } else if (user.role === Role.Student) {
    basePipeline.push({ $match: { student: new Types.ObjectId(user.id) } });
  }

  basePipeline.push(...ENROLLMENT_LOOKUP_STAGES);

  // Step 3: Layer the query-driven filter, sort, projection and pagination stages
  const { data, pagination } = await new APIFeatures(
    EnrollmentModel,
    filterQuery,
    basePipeline,
  )
    .filter([
      "student._id",
      "course._id",
      "instructor._id",
      "transaction._id",
      "watchedCompletely",
      "certificateIssued",
    ])
    .sort()
    .projection()
    .paginate()
    .exec();

  return { enrollments: data.map(toEnrollmentDetails), pagination };
};

// FUNCTION
export const getEnrollmentByIdService = async (
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
  if (
    user.role === Role.Instructor &&
    enrollment.instructor?._id?.toString() !== user.id
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this enrollment",
    );
  }

  if (
    user.role === Role.Student &&
    enrollment.student?._id?.toString() !== user.id
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this enrollment",
    );
  }

  return toEnrollmentDetails(enrollment);
};
