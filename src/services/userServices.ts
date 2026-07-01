import { PipelineStage } from "mongoose";
import UserModel from "@src/models/userModel";
import { GetInstructorsQuery } from "@src/types/userTypes";

export const getInstructorsService = async (
  query: GetInstructorsQuery,
): Promise<any> => {
  const pipeline: PipelineStage[] = [];

  pipeline.push({
    $match: {
      role: "instructor",
      isVerified: query.isVerified,
    },
  });

  if (query.search) {
    pipeline.push({
      $match: {
        $or: [
          { fullName: { $regex: query.search, $options: "i" } },
          { email: { $regex: query.search, $options: "i" } },
        ],
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "total" }];

  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  const [instructors, countResult] = await Promise.all([
    UserModel.aggregate(pipeline),
    UserModel.aggregate(countPipeline),
  ]);

  const totalDocuments = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalDocuments / query.limit);

  return {
    instructors,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalDocuments,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
};
