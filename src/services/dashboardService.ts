import { Types } from "mongoose";
import AppError from "../utils/appError";
import TransactionModel from "../models/transactionModel";
import UserModel, { Role } from "../models/userModel";
import CourseModel from "../models/courseModel";
import EnrollmentModel from "../models/enrollmentModel";
import ReviewModel from "../models/reviewModel";
import { formatUserAvatarUrl } from "./userService";
import { getPublicS3Url } from "./s3Service";
import {
  DashboardPeriod,
  DashboardAuthUser,
  AdminDashboardData,
  AdminDashboardStats,
  TopPerformingCourse,
  AdminRecentUser,
  InstructorDashboardData,
  InstructorDashboardStats,
  InstructorRevenueByCourse,
  InstructorCoursePerformance,
  InstructorRecentReview,
  StudentDashboardData,
  StudentDashboardStats,
  StudentContinueWatchingItem,
  StudentRecentTransaction,
  StudentRecentReview,
} from "../types/dashboardType";


// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS_OF_YEAR = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Helper : Date Range ──────────────────────────────────────────────────────

const getDateRange = (period: DashboardPeriod): Date => {
  const now = new Date();
  const days = period === "week" ? 7 : period === "month" ? 30 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};

// ─── Helper : Stats ───────────────────────────────────────────────────────────

const getTotalRevenue = async (startDate: Date): Promise<number> => {
  const result = await TransactionModel.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        amountPaidAt: { $gte: startDate },
      },
    },
    {
      $group: { _id: null, total: { $sum: "$amountPaid" } },
    },
  ]);
  return result[0]?.total ?? 0;
};

const getAdminCommissionTotal = async (startDate: Date): Promise<number> => {
  const result = await TransactionModel.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        amountPaidAt: { $gte: startDate },
      },
    },
    {
      $group: { _id: null, total: { $sum: "$adminCommission" } },
    },
  ]);
  return result[0]?.total ?? 0;
};

const getTotalStudents = async (startDate: Date): Promise<number> => {
  return UserModel.countDocuments({
    role: Role.Student,
    createdAt: { $gte: startDate },
  });
};

const getTotalInstructors = async (startDate: Date): Promise<number> => {
  return UserModel.countDocuments({
    role: Role.Instructor,
    createdAt: { $gte: startDate },
  });
};

const getTotalCourses = async (startDate: Date): Promise<number> => {
  return CourseModel.countDocuments({
    isVerified: true,
    verificationRejectionReason: null,
    createdAt: { $gte: startDate },
  });
};

// ─── Helper : Revenue Trend ───────────────────────────────────────────────────

const getRevenueTrend = async (
  period: DashboardPeriod,
  startDate: Date,
): Promise<Record<string, number>> => {
  if (period === "week") {
    // Group by day-of-week name (Sunday=1 … Saturday=7 in MongoDB)
    const results = await TransactionModel.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          amountPaidAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$amountPaidAt" },
          total: { $sum: "$amountPaid" },
        },
      },
    ]);

    const trend: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    results.forEach((r) => {
      const dayName = DAYS_OF_WEEK[r._id - 1]; // $dayOfWeek: 1=Sunday
      if (dayName) trend[dayName] = r.total;
    });

    return trend;
  }

  if (period === "month") {
    // Group into 4 week buckets based on day-of-month
    const results = await TransactionModel.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          amountPaidAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $lte: [{ $dayOfMonth: "$amountPaidAt" }, 7] },
                  then: 1,
                },
                {
                  case: { $lte: [{ $dayOfMonth: "$amountPaidAt" }, 14] },
                  then: 2,
                },
                {
                  case: { $lte: [{ $dayOfMonth: "$amountPaidAt" }, 21] },
                  then: 3,
                },
              ],
              default: 4,
            },
          },
          total: { $sum: "$amountPaid" },
        },
      },
    ]);

    const trend: Record<string, number> = {
      "Week 1": 0,
      "Week 2": 0,
      "Week 3": 0,
      "Week 4": 0,
    };

    results.forEach((r) => {
      trend[`Week ${r._id}`] = r.total;
    });

    return trend;
  }

  // year — group by calendar month name
  const results = await TransactionModel.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        amountPaidAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $month: "$amountPaidAt" },
        total: { $sum: "$amountPaid" },
      },
    },
  ]);

  const trend: Record<string, number> = {};
  MONTHS_OF_YEAR.forEach((m) => (trend[m] = 0));

  results.forEach((r) => {
    const monthName = MONTHS_OF_YEAR[r._id - 1]; // $month: 1=January
    if (monthName) trend[monthName] = r.total;
  });

  return trend;
};

// ─── Helper : User Growth ─────────────────────────────────────────────────────

const getUserGrowth = async (
  period: DashboardPeriod,
  startDate: Date,
): Promise<Record<string, number>> => {
  if (period === "week") {
    const results = await UserModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const growth: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    results.forEach((r) => {
      const dayName = DAYS_OF_WEEK[r._id - 1];
      if (dayName) growth[dayName] = r.count;
    });

    return growth;
  }

  if (period === "month") {
    const results = await UserModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $lte: [{ $dayOfMonth: "$createdAt" }, 7] },
                  then: 1,
                },
                {
                  case: { $lte: [{ $dayOfMonth: "$createdAt" }, 14] },
                  then: 2,
                },
                {
                  case: { $lte: [{ $dayOfMonth: "$createdAt" }, 21] },
                  then: 3,
                },
              ],
              default: 4,
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const growth: Record<string, number> = {
      "Week 1": 0,
      "Week 2": 0,
      "Week 3": 0,
      "Week 4": 0,
    };

    results.forEach((r) => {
      growth[`Week ${r._id}`] = r.count;
    });

    return growth;
  }

  // year
  const results = await UserModel.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const growth: Record<string, number> = {};
  MONTHS_OF_YEAR.forEach((m) => (growth[m] = 0));

  results.forEach((r) => {
    const monthName = MONTHS_OF_YEAR[r._id - 1];
    if (monthName) growth[monthName] = r.count;
  });

  return growth;
};

// ─── Helper : Top Performing Courses ─────────────────────────────────────────

const getTopPerformingCourses = async (
  startDate: Date,
): Promise<TopPerformingCourse[]> => {
  const results = await EnrollmentModel.aggregate([
    // 1. Only enrollments created within the period
    { $match: { createdAt: { $gte: startDate } } },

    // 2. Group by course, count enrollments
    {
      $group: {
        _id: "$course",
        enrollmentsInPeriod: { $sum: 1 },
      },
    },

    // 3. Top 5 by enrollment count
    { $sort: { enrollmentsInPeriod: -1 } },
    { $limit: 5 },

    // 4. Join course details
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "courseDetails",
      },
    },
    { $unwind: "$courseDetails" },

    // 5. Join instructor details
    {
      $lookup: {
        from: "users",
        localField: "courseDetails.instructor",
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

    // 6. Calculate admin commission earned for this course in this period
    {
      $lookup: {
        from: "transactions",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$course", "$$courseId"] },
              paymentStatus: "paid",
              amountPaidAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: null,
              totalCommission: { $sum: "$adminCommission" },
            },
          },
        ],
        as: "commissionData",
      },
    },

    // 7. Project final shape
    {
      $project: {
        _id: 0,
        courseId: "$_id",
        title: "$courseDetails.title",
        instructorName: "$instructorDetails.fullName",
        enrollmentsInPeriod: 1,
        averageRating: "$courseDetails.averageRating",
        adminCommissionEarned: {
          $ifNull: [
            { $arrayElemAt: ["$commissionData.totalCommission", 0] },
            0,
          ],
        },
      },
    },
  ]);

  return results as TopPerformingCourse[];
};

// ─── Helper : Recent Users ─────────────────────────────────────────────────────

const getRecentUsers = async (): Promise<AdminRecentUser[]> => {
  const users = await UserModel.find()
    .select("fullName email role isVerified createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return users as unknown as AdminRecentUser[];
};

// ─── Main Service Functions ───────────────────────────────────────────────────

// FUNCTION
export const getAdminDashboardService = async (
  _user: DashboardAuthUser | undefined,
  period: DashboardPeriod,
): Promise<AdminDashboardData> => {
  const startDate = getDateRange(period);

  // Run all queries in parallel for performance
  const [
    totalRevenue,
    adminCommission,
    totalStudents,
    totalInstructors,
    totalCourses,
    revenueTrend,
    userGrowth,
    topPerformingCourses,
    recentUsers,
  ] = await Promise.all([
    getTotalRevenue(startDate),
    getAdminCommissionTotal(startDate),
    getTotalStudents(startDate),
    getTotalInstructors(startDate),
    getTotalCourses(startDate),
    getRevenueTrend(period, startDate),
    getUserGrowth(period, startDate),
    getTopPerformingCourses(startDate),
    getRecentUsers(),
  ]);

  const stats: AdminDashboardStats = {
    totalRevenue,
    adminCommission,
    totalStudents,
    totalInstructors,
    totalCourses,
  };

  return {
    stats,
    revenueTrend,
    userGrowth,
    topPerformingCourses,
    recentUsers,
  };
};

// ─── Instructor Dashboard Helpers ─────────────────────────────────────────────

const getInstructorTotalRevenue = async (
  instructorId: Types.ObjectId,
  startDate: Date,
): Promise<number> => {
  const result = await TransactionModel.aggregate([
    {
      $match: {
        instructor: instructorId,
        paymentStatus: "paid",
        amountPaidAt: { $gte: startDate },
      },
    },
    {
      $group: { _id: null, total: { $sum: "$instructorRevenue" } },
    },
  ]);
  return result[0]?.total ?? 0;
};

const getInstructorAdminCommission = async (
  instructorId: Types.ObjectId,
  startDate: Date,
): Promise<number> => {
  const result = await TransactionModel.aggregate([
    {
      $match: {
        instructor: instructorId,
        paymentStatus: "paid",
        amountPaidAt: { $gte: startDate },
      },
    },
    {
      $group: { _id: null, total: { $sum: "$adminCommission" } },
    },
  ]);
  return result[0]?.total ?? 0;
};

const getInstructorTotalStudents = async (
  instructorId: Types.ObjectId,
  startDate: Date,
): Promise<number> => {
  const result = await EnrollmentModel.aggregate([
    {
      $match: {
        instructor: instructorId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: { _id: "$student" },
    },
    {
      $count: "total",
    },
  ]);
  return result[0]?.total ?? 0;
};

const getInstructorTotalCourses = async (
  instructorId: Types.ObjectId,
): Promise<number> => {
  return CourseModel.countDocuments({
    instructor: instructorId,
  });
};

const getInstructorAverageRating = async (
  instructorId: Types.ObjectId,
): Promise<number> => {
  const result = await ReviewModel.aggregate([
    {
      $match: { instructor: instructorId },
    },
    {
      $group: { _id: null, avgRating: { $avg: "$rating" } },
    },
  ]);
  return result[0]?.avgRating
    ? Math.round(result[0].avgRating * 10) / 10
    : 0;
};

const getInstructorRevenueByCourse = async (
  instructorId: Types.ObjectId,
  startDate: Date,
): Promise<InstructorRevenueByCourse[]> => {
  const results = await TransactionModel.aggregate([
    {
      $match: {
        instructor: instructorId,
        paymentStatus: "paid",
        amountPaidAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$course",
        revenue: { $sum: "$instructorRevenue" },
      },
    },
    { $sort: { revenue: -1 } },
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "courseDetails",
      },
    },
    { $unwind: "$courseDetails" },
    {
      $project: {
        _id: 0,
        courseId: { $toString: "$_id" },
        title: "$courseDetails.title",
        courseTitle: "$courseDetails.title",
        revenue: 1,
      },
    },
  ]);

  return results as InstructorRevenueByCourse[];
};

const getInstructorEnrollmentsTrend = async (
  instructorId: Types.ObjectId,
  period: DashboardPeriod,
  startDate: Date,
): Promise<Record<string, number>> => {
  if (period === "week") {
    const results = await EnrollmentModel.aggregate([
      {
        $match: {
          instructor: instructorId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const trend: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    results.forEach((r) => {
      const dayName = DAYS_OF_WEEK[r._id - 1];
      if (dayName) trend[dayName] = r.count;
    });

    return trend;
  }

  if (period === "month") {
    const results = await EnrollmentModel.aggregate([
      {
        $match: {
          instructor: instructorId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                {
                  case: { $lte: [{ $dayOfMonth: "$createdAt" }, 7] },
                  then: 1,
                },
                {
                  case: { $lte: [{ $dayOfMonth: "$createdAt" }, 14] },
                  then: 2,
                },
                {
                  case: { $lte: [{ $dayOfMonth: "$createdAt" }, 21] },
                  then: 3,
                },
              ],
              default: 4,
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const trend: Record<string, number> = {
      "Week 1": 0,
      "Week 2": 0,
      "Week 3": 0,
      "Week 4": 0,
    };

    results.forEach((r) => {
      trend[`Week ${r._id}`] = r.count;
    });

    return trend;
  }

  const results = await EnrollmentModel.aggregate([
    {
      $match: {
        instructor: instructorId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const trend: Record<string, number> = {};
  MONTHS_OF_YEAR.forEach((m) => (trend[m] = 0));

  results.forEach((r) => {
    const monthName = MONTHS_OF_YEAR[r._id - 1];
    if (monthName) trend[monthName] = r.count;
  });

  return trend;
};

const getInstructorCoursePerformance = async (
  instructorId: Types.ObjectId,
): Promise<InstructorCoursePerformance[]> => {
  const courses = await CourseModel.find({ instructor: instructorId })
    .sort({ totalStudentsEnrolled: -1 })
    .limit(5)
    .lean();

  if (courses.length === 0) return [];

  const courseIds = courses.map((c) => c._id);

  const completionStats = await EnrollmentModel.aggregate([
    { $match: { course: { $in: courseIds } } },
    {
      $group: {
        _id: "$course",
        avgCompletion: { $avg: "$watchPercentage" },
        enrollmentCount: { $sum: 1 },
      },
    },
  ]);

  const completionMap = new Map<
    string,
    { avgCompletion: number; enrollmentCount: number }
  >();
  completionStats.forEach((stat) => {
    completionMap.set(stat._id.toString(), {
      avgCompletion: stat.avgCompletion
        ? Math.round(stat.avgCompletion * 10) / 10
        : 0,
      enrollmentCount: stat.enrollmentCount ?? 0,
    });
  });

  return courses.map((course) => {
    const stat = completionMap.get(course._id.toString());
    return {
      courseId: course._id.toString(),
      title: course.title,
      courseTitle: course.title,
      isVerified: course.isVerified,
      enrollments: stat?.enrollmentCount ?? course.totalStudentsEnrolled ?? 0,
      rating: course.averageRating ?? 0,
      avgCompletion: stat?.avgCompletion ?? 0,
      revenue: course.totalRevenueInstructor ?? 0,
    };
  });
};

const getInstructorRecentReviews = async (
  instructorId: Types.ObjectId,
): Promise<InstructorRecentReview[]> => {
  const reviews = await ReviewModel.find({ instructor: instructorId })
    .populate("course", "title")
    .populate("reviewBy", "fullName avatarKey")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return reviews.map((r: any) => {
    const userWithAvatar = r.reviewBy ? formatUserAvatarUrl(r.reviewBy) : null;
    return {
      reviewId: r._id.toString(),
      courseId: r.course?._id?.toString() ?? "",
      courseTitle: r.course?.title ?? "Unknown Course",
      studentName: r.reviewBy?.fullName ?? "Anonymous",
      studentAvatarUrl: userWithAvatar?.avatarUrl ?? null,
      rating: r.rating,
      review: r.feedback,
      feedback: r.feedback,
      createdAt: r.createdAt,
    };
  });
};

// FUNCTION
export const getInstructorDashboardService = async (
  user: DashboardAuthUser | undefined,
  period: DashboardPeriod,
): Promise<InstructorDashboardData> => {
  if (!user?.id) {
    throw new AppError(401, "You are not logged in. Please sign in to continue");
  }

  const instructorId = new Types.ObjectId(user.id);
  const startDate = getDateRange(period);

  const [
    totalRevenue,
    adminCommission,
    totalStudents,
    totalCourses,
    averageRating,
    revenueByCourse,
    enrollmentsTrend,
    coursePerformance,
    recentReviews,
  ] = await Promise.all([
    getInstructorTotalRevenue(instructorId, startDate),
    getInstructorAdminCommission(instructorId, startDate),
    getInstructorTotalStudents(instructorId, startDate),
    getInstructorTotalCourses(instructorId),
    getInstructorAverageRating(instructorId),
    getInstructorRevenueByCourse(instructorId, startDate),
    getInstructorEnrollmentsTrend(instructorId, period, startDate),
    getInstructorCoursePerformance(instructorId),
    getInstructorRecentReviews(instructorId),
  ]);

  const stats: InstructorDashboardStats = {
    totalRevenue,
    adminCommission,
    totalStudents,
    totalCourses,
    averageRating,
  };

  return {
    stats,
    revenueByCourse,
    enrollmentsTrend,
    coursePerformance,
    recentReviews,
  };
};

// ─── Student Dashboard Helpers ────────────────────────────────────────────────

const getStudentEnrolledCourses = async (
  studentId: Types.ObjectId,
): Promise<number> => {
  return EnrollmentModel.countDocuments({ student: studentId });
};

const getStudentCompletedCourses = async (
  studentId: Types.ObjectId,
): Promise<number> => {
  return EnrollmentModel.countDocuments({
    student: studentId,
    watchedCompletely: true,
  });
};

const getStudentAverageCompletionPercentage = async (
  studentId: Types.ObjectId,
): Promise<number> => {
  const result = await EnrollmentModel.aggregate([
    { $match: { student: studentId } },
    { $group: { _id: null, avgCompletion: { $avg: "$watchPercentage" } } },
  ]);
  return result[0]?.avgCompletion
    ? Math.round(result[0].avgCompletion * 10) / 10
    : 0;
};

const getStudentTotalWatchTime = async (
  studentId: Types.ObjectId,
): Promise<number> => {
  const result = await EnrollmentModel.aggregate([
    { $match: { student: studentId } },
    {
      $group: {
        _id: null,
        totalWatchTime: { $sum: "$totalDurationWatchedInMinutes" },
      },
    },
  ]);
  return result[0]?.totalWatchTime
    ? Math.round(result[0].totalWatchTime * 10) / 10
    : 0;
};

const getStudentContinueWatching = async (
  studentId: Types.ObjectId,
): Promise<StudentContinueWatchingItem[]> => {
  const enrollments = await EnrollmentModel.find({
    student: studentId,
    watchedCompletely: false,
  })
    .populate({
      path: "course",
      select: "title thumbnailKey totalDurationInMinutes",
    })
    .populate({
      path: "instructor",
      select: "fullName avatarKey",
    })
    .sort({ mostRecentlySeen: -1, updatedAt: -1 })
    .limit(3)
    .lean();

  let allEnrollments = enrollments;
  if (allEnrollments.length < 3) {
    const existingIds = allEnrollments.map((e) => e._id);
    const additional = await EnrollmentModel.find({
      student: studentId,
      _id: { $nin: existingIds },
    })
      .populate({
        path: "course",
        select: "title thumbnailKey totalDurationInMinutes",
      })
      .populate({
        path: "instructor",
        select: "fullName avatarKey",
      })
      .sort({ updatedAt: -1 })
      .limit(3 - allEnrollments.length)
      .lean();

    allEnrollments = [...allEnrollments, ...additional];
  }

  return allEnrollments.map((e: any) => {
    const course = e.course;
    const instructor = e.instructor
      ? formatUserAvatarUrl(e.instructor)
      : null;
    const thumbnailUrl = course?.thumbnailKey
      ? getPublicS3Url(course.thumbnailKey)
      : null;

    return {
      enrollmentId: e._id.toString(),
      courseId: course?._id?.toString() ?? "",
      title: course?.title ?? "Unknown Course",
      thumbnailUrl,
      instructorName: instructor?.fullName ?? "Unknown Instructor",
      instructorAvatarUrl: instructor?.avatarUrl ?? null,
      watchPercentage: e.watchPercentage ?? 0,
      totalDurationWatchedInMinutes: e.totalDurationWatchedInMinutes ?? 0,
      totalDurationInMinutes: course?.totalDurationInMinutes ?? 0,
      mostRecentlySeen: Boolean(e.mostRecentlySeen),
      updatedAt: e.updatedAt,
    };
  });
};

const getStudentRecentTransactions = async (
  studentId: Types.ObjectId,
): Promise<StudentRecentTransaction[]> => {
  const transactions = await TransactionModel.find({ student: studentId })
    .populate({
      path: "course",
      select: "title thumbnailKey",
    })
    .populate({
      path: "instructor",
      select: "fullName avatarKey",
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return transactions.map((t: any) => {
    const course = t.course;
    const instructor = t.instructor
      ? formatUserAvatarUrl(t.instructor)
      : null;
    const courseThumbnailUrl = course?.thumbnailKey
      ? getPublicS3Url(course.thumbnailKey)
      : null;

    return {
      id: t._id.toString(),
      transactionId: t.transactionId,
      courseId: course?._id?.toString() ?? "",
      courseTitle: course?.title ?? "Unknown Course",
      courseThumbnailUrl,
      instructorName: instructor?.fullName ?? "Unknown Instructor",
      instructorAvatarUrl: instructor?.avatarUrl ?? null,
      amountPaid: t.amountPaid,
      paymentStatus: t.paymentStatus,
      currency: t.currency ?? "usd",
      amountPaidAt: t.amountPaidAt ?? null,
      createdAt: t.createdAt,
    };
  });
};

const getStudentRecentReviews = async (
  studentId: Types.ObjectId,
): Promise<StudentRecentReview[]> => {
  const reviews = await ReviewModel.find({ reviewBy: studentId })
    .populate({
      path: "course",
      select: "title thumbnailKey",
    })
    .populate({
      path: "instructor",
      select: "fullName avatarKey",
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return reviews.map((r: any) => {
    const course = r.course;
    const instructor = r.instructor
      ? formatUserAvatarUrl(r.instructor)
      : null;
    const courseThumbnailUrl = course?.thumbnailKey
      ? getPublicS3Url(course.thumbnailKey)
      : null;

    return {
      reviewId: r._id.toString(),
      courseId: course?._id?.toString() ?? "",
      courseTitle: course?.title ?? "Unknown Course",
      courseThumbnailUrl,
      instructorName: instructor?.fullName ?? "Unknown Instructor",
      instructorAvatarUrl: instructor?.avatarUrl ?? null,
      rating: r.rating,
      review: r.feedback,
      feedback: r.feedback,
      createdAt: r.createdAt,
    };
  });
};

// FUNCTION
export const getStudentDashboardService = async (
  user: DashboardAuthUser | undefined,
): Promise<StudentDashboardData> => {
  if (!user?.id) {
    throw new AppError(401, "You are not logged in. Please sign in to continue");
  }

  const studentId = new Types.ObjectId(user.id);

  const [
    enrolledCourses,
    completedCourses,
    averageCompletionPercentage,
    totalWatchTime,
    continueWatching,
    recentTransactions,
    recentReviews,
  ] = await Promise.all([
    getStudentEnrolledCourses(studentId),
    getStudentCompletedCourses(studentId),
    getStudentAverageCompletionPercentage(studentId),
    getStudentTotalWatchTime(studentId),
    getStudentContinueWatching(studentId),
    getStudentRecentTransactions(studentId),
    getStudentRecentReviews(studentId),
  ]);

  const stats: StudentDashboardStats = {
    enrolledCourses,
    completedCourses,
    averageCompletionPercentage,
    totalWatchTime,
  };

  return {
    stats,
    continueWatching,
    recentTransactions,
    recentReviews,
  };
};
