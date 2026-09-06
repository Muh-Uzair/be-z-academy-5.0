import { PipelineStage, Types } from "mongoose";
import TransactionModel, { TransactionType } from "../models/transactionModel";
import { Role } from "../models/userModel";
import { CourseType } from "../models/courseModel";
import AppError from "../utils/appError";
import APIFeatures from "../utils/apiFeatures";
import { GetTransactionsQuery } from "../types/transactionType";
import { Pagination } from "../utils/sendResponse";
import { verifyTransactionAccessOrThrow } from "../utils/transactionUtil";
import { excludeUserFields, excludeCourseInternalFields } from "../utils/lookupProjections";

interface TransactionUserSummary {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  avatar: string | null;
}

type TransactionCourseSummary = Omit<
  CourseType,
  "thumbnailKey" | "videoKey" | "instructor" | "category"
>;

// Shape of each transaction once TRANSACTION_LOOKUP_STAGES has joined and
// replaced student/course/instructor ids with public-safe *Details
// sub-documents.
export type TransactionListItem = Omit<
  TransactionType,
  "student" | "course" | "instructor"
> & {
  studentDetails: TransactionUserSummary;
  courseDetails: TransactionCourseSummary;
  instructorDetails: TransactionUserSummary;
};

// Each reference is joined into a *Details field so the response shape is
// already correct without any post-processing mapper.
// The final $project drops the original ObjectId fields that are superseded
// by the joined documents, and scrubs sensitive fields that $lookup would
// otherwise pull in from the joined documents unfiltered.
const TRANSACTION_LOOKUP_STAGES: PipelineStage[] = [
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
    $project: {
      student: 0,
      course: 0,
      instructor: 0,
      ...excludeUserFields("studentDetails"),
      ...excludeUserFields("instructorDetails"),
      ...excludeCourseInternalFields("courseDetails"),
    },
  },
];

// FUNCTION
export const getTransactionsService = async (
  query: GetTransactionsQuery,
  user: { id: string; role: string },
): Promise<{ transactions: TransactionListItem[]; pagination: Pagination | null }> => {
  // Step 1: Cast the reference id filters to ObjectId, targeting the raw
  // field names so MongoDB can use indexes before any lookups occur.
  const filterQuery = {
    ...query,
    student: query.student ? new Types.ObjectId(query.student) : undefined,
    course: query.course ? new Types.ObjectId(query.course) : undefined,
    instructor: query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
  };

  // Step 2: Scope results by role - admins see everything, instructors see
  // their own courses' transactions, students see only their own.
  const basePipeline: PipelineStage[] = [];

  if (user.role === Role.Instructor) {
    basePipeline.push({
      $match: { instructor: new Types.ObjectId(user.id) },
    });
  } else if (user.role === Role.Student) {
    basePipeline.push({ $match: { student: new Types.ObjectId(user.id) } });
  }

  // Step 3: Layer the query-driven filter, search, sort, lookup, projection, and pagination stages.
  // By calling .join() AFTER .filter() and .search(), MongoDB's optimizer can use
  // indexes to dramatically reduce the dataset before performing expensive joins.
  const { data, pagination } = await new APIFeatures(
    TransactionModel,
    filterQuery,
    basePipeline,
  )
    .filter(["student", "course", "instructor", "paymentStatus"])
    .search(["transactionId"])
    .sort()
    .addStages(TRANSACTION_LOOKUP_STAGES)
    .projection()
    .paginate()
    .exec();

  // The pipeline's $lookup/$project stages reshape each document into
  // TransactionListItem, which APIFeatures' generic Model<TransactionType>
  // can't express — cast once at this boundary.
  return {
    transactions: data as unknown as TransactionListItem[],
    pagination,
  };
};

// FUNCTION
export const getTransactionDetailsService = async (
  id: string,
  user: { id: string; role: string },
): Promise<TransactionListItem> => {
  // Step 1: Fetch the transaction with every reference joined in place
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...TRANSACTION_LOOKUP_STAGES,
  ];

  const [transaction] = (await TransactionModel.aggregate(
    pipeline,
  )) as TransactionListItem[];

  if (!transaction) {
    throw new AppError(404, "Transaction not found");
  }

  // Step 2: Enforce ownership for non-admins
  verifyTransactionAccessOrThrow(transaction, user);

  return transaction;
};
