import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import {
  getCourseThumbnailUploadUrlService,
  getCourseVideoUploadUrlService,
  createCourseService,
  getCoursesService,
  getStudentCoursesService,
  getInstructorCoursesService,
  getPublicCoursesService,
  getFeaturedCoursesService,
  getTrendingCoursesService,
  getCourseDetailsService,
  getPublicCourseDetailsService,
  updateCourseService,
  updateCourseVerificationService,
  deleteCourseService,
  createCoursePaymentIntentService,
  requestCourseRefundService,
  getCourseRefundEligibilityService,
  getCourseCompletionStatusService,
} from "../services/courseService";
import {
  CourseIdParams,
  StudentIdParams,
  InstructorIdParams,
  CreateCourseBody,
  UpdateCourseBody,
  UpdateCourseVerificationBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
  GetPublicCoursesQuery,
} from "../types/courseType";
import sendResponse from "../utils/sendResponse";

export const uploadCourseThumbnail = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.validatedBody as UploadCourseThumbnailBody;

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
    const body = req.validatedBody as UploadCourseVideoBody;

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
    const body = req.validatedBody as CreateCourseBody;
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

    const { courses, pagination } = await getCoursesService(query, req.user!);

    sendResponse(res, 200, {
      status: "success",
      message: "Courses fetched successfully",
      data: { courses, pagination },
    });
  },
);

export const getStudentCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as StudentIdParams;
    const query = req.validatedQuery as GetCoursesQuery;

    const { courses, pagination } = await getStudentCoursesService(
      id,
      query,
      req.user!,
    );

    sendResponse(res, 200, {
      status: "success",
      message: "Student's courses fetched successfully",
      data: { courses, pagination },
    });
  },
);

export const getInstructorCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as InstructorIdParams;
    const query = req.validatedQuery as GetCoursesQuery;

    const { courses, pagination } = await getInstructorCoursesService(
      id,
      query,
      req.user!,
    );

    sendResponse(res, 200, {
      status: "success",
      message: "Instructor's courses fetched successfully",
      data: { courses, pagination },
    });
  },
);

export const getPublicCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetPublicCoursesQuery;

    const { courses, pagination } = await getPublicCoursesService(query);

    sendResponse(res, 200, {
      status: "success",
      message: "Courses fetched successfully",
      data: { courses, pagination },
    });
  },
);

export const getFeaturedCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const courses = await getFeaturedCoursesService();

    sendResponse(res, 200, {
      status: "success",
      message: "Featured courses fetched successfully",
      data: { courses },
    });
  },
);

export const getTrendingCourses = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const courses = await getTrendingCoursesService();

    sendResponse(res, 200, {
      status: "success",
      message: "Trending courses fetched successfully",
      data: { courses },
    });
  },
);

export const getCourseDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const user = req.user!;

    const course = await getCourseDetailsService(id, user);

    sendResponse(res, 200, {
      status: "success",
      message: "Course details fetched successfully",
      data: { course },
    });
  },
);

export const getPublicCourseDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;

    const course = await getPublicCourseDetailsService(id);

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
    const body = req.validatedBody as UpdateCourseBody;
    const instructorId = req.user!.id;

    const course = await updateCourseService(id, instructorId, body);

    sendResponse(res, 200, {
      status: "success",
      message: "Course updated successfully",
      data: { course },
    });
  },
);

export const updateCourseVerification = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const body = req.validatedBody as UpdateCourseVerificationBody;

    const course = await updateCourseVerificationService(id, body);

    sendResponse(res, 200, {
      status: "success",
      message: body.isVerified
        ? "Course approved successfully"
        : "Course rejected successfully",
      data: { course },
    });
  },
);

export const createCoursePaymentIntent = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const studentId = req.user!.id;

    const data = await createCoursePaymentIntentService(studentId, id);

    sendResponse(res, 200, {
      status: "success",
      message: "Payment intent created successfully",
      data,
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

export const requestCourseRefund = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const studentId = req.user!.id;

    await requestCourseRefundService(studentId, id);

    sendResponse(res, 200, {
      status: "success",
      message:
        "Refund initiated successfully. Your money will be returned within 5-10 business days",
      data: null,
    });
  },
);

export const getCourseRefundEligibility = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const studentId = req.user!.id;

    const eligibility = await getCourseRefundEligibilityService(
      studentId,
      id,
    );

    sendResponse(res, 200, {
      status: "success",
      message: "Refund eligibility fetched successfully",
      data: { eligibility },
    });
  },
);

export const getCourseCompletionStatus = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CourseIdParams;
    const studentId = req.user!.id;

    const completionStatus = await getCourseCompletionStatusService(
      studentId,
      id,
    );

    sendResponse(res, 200, {
      status: "success",
      message: "Course completion status fetched successfully",
      data: completionStatus,
    });
  },
);
