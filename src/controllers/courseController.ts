import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getCourseThumbnailUploadUrlService,
  getCourseVideoUploadUrlService,
  createCourseService,
  getInstructorCoursesService,
  getInstructorCourseByIdService,
  updateInstructorCourseService,
  deleteInstructorCourseService,
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

export const getMyCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetCoursesQuery;
    const instructorId = req.user!.id;

    const { courses, pagination } = await getInstructorCoursesService(
      instructorId,
      query,
    );

    sendResponse(res, 200, {
      status: "success",
      message: "Courses fetched successfully",
      data: { courses, pagination },
    });
  },
);

export const getMyCourseDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const instructorId = req.user!.id;

    const course = await getInstructorCourseByIdService(id, instructorId);

    sendResponse(res, 200, {
      status: "success",
      message: "Course details fetched successfully",
      data: { course },
    });
  },
);

export const updateMyCourse = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const body = req.body as UpdateCourseBody;
    const instructorId = req.user!.id;

    const course = await updateInstructorCourseService(id, instructorId, body);

    sendResponse(res, 200, {
      status: "success",
      message: "Course updated successfully",
      data: { course },
    });
  },
);

export const deleteMyCourse = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const instructorId = req.user!.id;

    await deleteInstructorCourseService(id, instructorId);

    sendResponse(res, 200, {
      status: "success",
      message: "Course deleted successfully",
      data: null,
    });
  },
);
