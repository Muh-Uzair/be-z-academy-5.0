import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getCourseThumbnailUploadUrlService,
  getCourseVideoUploadUrlService,
  createCourseService,
  getCoursesService,
  getCourseByIdService,
  updateCourseService,
  deleteCourseService,
} from "@src/services/courseServices";
import {
  CourseIdParams,
  CreateCourseBody,
  UpdateCourseBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
} from "@src/types/courseTypes";
import sendResponse from "@src/utils/sendResponse";

export const uploadCourseThumbnail = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UploadCourseThumbnailBody;

    const { uploadUrl, fields, key } =
      await getCourseThumbnailUploadUrlService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "Course thumbnail upload URL generated successfully",
      data: { uploadUrl, fields, key },
    });
  },
);

export const uploadCourseVideo = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UploadCourseVideoBody;

    const { uploadUrl, fields, key } =
      await getCourseVideoUploadUrlService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "Course video upload URL generated successfully",
      data: { uploadUrl, fields, key },
    });
  },
);

export const createCourse = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateCourseBody;
    const instructorId = req.user!.id;

    const course = await createCourseService(instructorId, body);

    sendResponse(res, 201, {
      status: "success",
      message: "Course created successfully, it will be reviewed by an Admin",
      data: { course },
    });
  },
);

export const getCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetCoursesQuery;

    const { courses, pagination } = await getCoursesService(query, req.user);

    sendResponse(res, 200, {
      status: "success",
      message: "Courses fetched successfully",
      data: { courses, pagination },
    });
  },
);

export const getCourseDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;

    const course = await getCourseByIdService(id);

    sendResponse(res, 200, {
      status: "success",
      message: "Course details fetched successfully",
      data: { course },
    });
  },
);

export const updateCourse = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const body = req.body as UpdateCourseBody;
    const instructorId = req.user!.id;

    const course = await updateCourseService(id, instructorId, body);

    sendResponse(res, 200, {
      status: "success",
      message: "Course updated successfully",
      data: { course },
    });
  },
);

export const deleteCourse = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const instructorId = req.user!.id;

    await deleteCourseService(id, instructorId);

    sendResponse(res, 200, {
      status: "success",
      message: "Course deleted successfully",
      data: null,
    });
  },
);
