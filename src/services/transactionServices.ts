import { PipelineStage, Types } from "mongoose";
import TransactionModel from "@src/models/transactionModel";
import { Role } from "@src/models/userModel";
import AppError from "@src/utils/appError";
import APIFeatures from "@src/utils/apiFeatures";
import { GetTransactionsQuery } from "@src/types/transactionTypes";

// Every reference is joined in place (lookup `as` reuses the original field
// name), so the raw ObjectId is replaced with the nested document at that
// same key. This is what lets query filters target e.g. "course._id".
const TRANSACTION_LOOKUP_STAGES: PipelineStage[] = [
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
];

// Renames the now-joined reference fields to *Details for the response, so
// callers get e.g. courseDetails: {} instead of course: "<mongo id>".
const toTransactionDetails = (doc: any) => {
  const { student, course, instructor, ...rest } = doc;
  return {
    ...rest,
    studentDetails: student,
    courseDetails: course,
    instructorDetails: instructor,
  };
};

// FUNCTION
export const getTransactionsService = async (
  query: GetTransactionsQuery,
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
  };

  // Step 2: Scope results by role - admins see everything, instructors see
  // their own courses' transactions, students see only their own
  const basePipeline: PipelineStage[] = [];

  if (user.role === Role.Instructor) {
    basePipeline.push({
      $match: { instructor: new Types.ObjectId(user.id) },
    });
  } else if (user.role === Role.Student) {
    basePipeline.push({ $match: { student: new Types.ObjectId(user.id) } });
  }

  basePipeline.push(...TRANSACTION_LOOKUP_STAGES);

  // Step 3: Layer the query-driven filter, search, sort, projection and pagination stages
  const { data, pagination } = await new APIFeatures(
    TransactionModel,
    filterQuery,
    basePipeline,
  )
    .filter(["student._id", "course._id", "instructor._id", "paymentStatus"])
    .search(["transactionId"])
    .sort()
    .projection()
    .paginate()
    .exec();

  return { transactions: data.map(toTransactionDetails), pagination };
};

// FUNCTION
export const getTransactionByIdService = async (
  id: string,
  user: { id: string; role: string },
): Promise<any> => {
  // Step 1: Fetch the transaction with every reference joined in place
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...TRANSACTION_LOOKUP_STAGES,
  ];

  const [transaction] = await TransactionModel.aggregate(pipeline);

  if (!transaction) {
    throw new AppError(404, "Transaction not found");
  }

  // Step 2: Enforce ownership for non-admins
  if (
    user.role === Role.Instructor &&
    transaction.instructor?._id?.toString() !== user.id
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this transaction",
    );
  }

  if (
    user.role === Role.Student &&
    transaction.student?._id?.toString() !== user.id
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this transaction",
    );
  }

  return toTransactionDetails(transaction);
};
