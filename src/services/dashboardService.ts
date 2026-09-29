import TransactionModel from "../models/transactionModel";
import UserModel from "../models/userModel";
import CourseModel from "../models/courseModel";
import EnrollmentModel from "../models/enrollmentModel";
import ReviewModel from "../models/reviewModel";
import { Types } from "mongoose";
import { getPublicS3Url } from "./s3Service";
import {
  AdminDashboardQuery,
  InstructorDashboardQuery,
  StudentDashboardQuery,
} from "../types/dashboardType";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a period ("week" | "month" | "year"), returns:
 *  - currentStart / currentEnd: the current window
 *  - previousStart / previousEnd: the previous window of the same length
 *  - bucketFormat: a MongoDB dateToString format string for grouping chart data
 *  - buckets: ordered label strings for the chart x-axis
 */
function getPeriodBounds(period: AdminDashboardQuery["period"]) {
  // All date math is UTC so it matches MongoDB's $dateToString (UTC) and does
  // not depend on the server's local timezone.
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let bucketFormat: string;
  let buckets: string[];

  if (period === "week") {
    // Current week: last 7 days (today included)
    currentStart = addUtcDays(todayUtc, -6);
    previousStart = addUtcDays(currentStart, -7);
    previousEnd = new Date(currentStart);

    bucketFormat = "%Y-%m-%d";

    // Build 7 day labels: oldest → newest
    buckets = Array.from({ length: 7 }, (_, i) =>
      addUtcDays(currentStart, i).toISOString().slice(0, 10),
    );
  } else if (period === "month") {
    // Current month: last 30 days
    currentStart = addUtcDays(todayUtc, -29);
    previousStart = addUtcDays(currentStart, -30);
    previousEnd = new Date(currentStart);

    // Group by ISO week (matches getISOWeekLabel). A 30-day window can touch
    // 5 or 6 distinct ISO weeks, so derive the labels from the actual days.
    bucketFormat = "%G-%V";

    const labels: string[] = [];
    for (let i = 0; i < 30; i++) {
      const label = getISOWeekLabel(addUtcDays(currentStart, i));
      if (labels[labels.length - 1] !== label) labels.push(label);
    }
    buckets = labels;
  } else {
    // year: last 12 calendar months
    currentStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    );
    previousStart = new Date(
      Date.UTC(currentStart.getUTCFullYear() - 1, currentStart.getUTCMonth(), 1),
    );
    previousEnd = new Date(currentStart);

    bucketFormat = "%Y-%m";

    // Build 12 month labels: oldest → newest
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(
        Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() + i, 1),
      );
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    });
  }

  const currentEnd = new Date(todayUtc);
  currentEnd.setUTCHours(23, 59, 59, 999);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    bucketFormat,
    buckets,
  };
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Returns "<ISO year>-<ISO week, 2 digits>" (same as Mongo "%G-%V"). */
function getISOWeekLabel(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // nearest Thursday
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

/** Calculates percentage change: ((current - previous) / previous) * 100 */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null; // avoid division by zero
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// ─── Return Types ─────────────────────────────────────────────────────────────

export interface RevenueChartPoint {
  label: string;
  totalRevenue: number;
  adminCommission: number;
}

export interface UserGrowthPoint {
  label: string;
  newStudents: number;
  newInstructors: number;
}

export interface SummaryCard {
  current: number;
  previous: number;
  changePercent: number | null;
}

export interface TopCourse {
  _id: unknown;
  title: string;
  instructorName: string;
  totalStudentsEnrolled: number;
  averageRating: number;
  totalRevenueAdmin: number;
}

export interface RecentUser {
  _id: unknown;
  fullName: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface AdminDashboardData {
  period: string;
  summary: {
    totalRevenue: SummaryCard;
    totalCommission: SummaryCard;
    totalStudents: SummaryCard;
    totalInstructors: SummaryCard;
    totalCourses: SummaryCard;
  };
  revenueTrend: RevenueChartPoint[];
  userGrowth: UserGrowthPoint[];
  topCourses: TopCourse[];
  recentUsers: RecentUser[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const getAdminDashboardService = async (
  query: AdminDashboardQuery,
): Promise<AdminDashboardData> => {
  const { period } = query;
  const {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    bucketFormat,
    buckets,
  } = getPeriodBounds(period);

  // ── Run all aggregations concurrently ──────────────────────────────────────

  const [
    currentRevStats,
    previousRevStats,
    currentStudentCount,
    previousStudentCount,
    currentInstructorCount,
    previousInstructorCount,
    currentCourseCount,
    previousCourseCount,
    revenueTrendRaw,
    userGrowthRaw,
    topCourses,
    recentUsers,
  ] = await Promise.all([
    // 1. Current period — revenue & commission from paid transactions
    TransactionModel.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          amountPaidAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amountPaid" },
          totalCommission: { $sum: "$adminCommission" },
        },
      },
    ]),

    // 2. Previous period — revenue & commission
    TransactionModel.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          amountPaidAt: { $gte: previousStart, $lt: previousEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amountPaid" },
          totalCommission: { $sum: "$adminCommission" },
        },
      },
    ]),

    // 3. Current period — new students
    UserModel.countDocuments({
      role: "student",
      createdAt: { $gte: currentStart, $lte: currentEnd },
    }),

    // 4. Previous period — new students
    UserModel.countDocuments({
      role: "student",
      createdAt: { $gte: previousStart, $lt: previousEnd },
    }),

    // 5. Current period — new instructors (verified)
    UserModel.countDocuments({
      role: "instructor",
      createdAt: { $gte: currentStart, $lte: currentEnd },
    }),

    // 6. Previous period — new instructors
    UserModel.countDocuments({
      role: "instructor",
      createdAt: { $gte: previousStart, $lt: previousEnd },
    }),

    // 7. Current period — new verified courses
    CourseModel.countDocuments({
      isVerified: true,
      createdAt: { $gte: currentStart, $lte: currentEnd },
    }),

    // 8. Previous period — new verified courses
    CourseModel.countDocuments({
      isVerified: true,
      createdAt: { $gte: previousStart, $lt: previousEnd },
    }),

    // 9. Revenue trend — bucketed by period
    TransactionModel.aggregate<{ _id: string; totalRevenue: number; adminCommission: number }>([
      {
        $match: {
          paymentStatus: "paid",
          amountPaidAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: bucketFormat, date: "$amountPaidAt" },
          },
          totalRevenue: { $sum: "$amountPaid" },
          adminCommission: { $sum: "$adminCommission" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 10. User growth — bucketed by period (students + instructors)
    UserModel.aggregate<{ _id: string; newStudents: number; newInstructors: number }>([
      {
        $match: {
          role: { $in: ["student", "instructor"] },
          createdAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: bucketFormat, date: "$createdAt" },
          },
          newStudents: {
            $sum: { $cond: [{ $eq: ["$role", "student"] }, 1, 0] },
          },
          newInstructors: {
            $sum: { $cond: [{ $eq: ["$role", "instructor"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 11. Top 5 performing courses by total students enrolled
    CourseModel.aggregate<TopCourse>([
      { $match: { isVerified: true } },
      { $sort: { totalStudentsEnrolled: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "instructor",
          foreignField: "_id",
          as: "instructorDoc",
        },
      },
      { $unwind: { path: "$instructorDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          totalStudentsEnrolled: 1,
          averageRating: 1,
          totalRevenueAdmin: 1,
          instructorName: { $ifNull: ["$instructorDoc.fullName", "Unknown"] },
        },
      },
    ]),

    // 12. 5 most recently joined users (any role)
    UserModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("fullName email role isVerified createdAt")
      .lean<RecentUser[]>(),
  ]);

  // ── Extract summary scalars ────────────────────────────────────────────────

  const curRev = currentRevStats[0] ?? { totalRevenue: 0, totalCommission: 0 };
  const prevRev = previousRevStats[0] ?? { totalRevenue: 0, totalCommission: 0 };

  // ── Fill revenue trend buckets ─────────────────────────────────────────────

  const revMap = new Map(
    revenueTrendRaw.map((r) => [r._id, { totalRevenue: r.totalRevenue, adminCommission: r.adminCommission }]),
  );
  const revenueTrend: RevenueChartPoint[] = buckets.map((label) => ({
    label,
    totalRevenue: revMap.get(label)?.totalRevenue ?? 0,
    adminCommission: revMap.get(label)?.adminCommission ?? 0,
  }));

  // ── Fill user growth buckets ───────────────────────────────────────────────

  const growthMap = new Map(
    userGrowthRaw.map((r) => [r._id, { newStudents: r.newStudents, newInstructors: r.newInstructors }]),
  );
  const userGrowth: UserGrowthPoint[] = buckets.map((label) => ({
    label,
    newStudents: growthMap.get(label)?.newStudents ?? 0,
    newInstructors: growthMap.get(label)?.newInstructors ?? 0,
  }));

  // ── Build summary cards ────────────────────────────────────────────────────

  return {
    period,
    summary: {
      totalRevenue: {
        current: curRev.totalRevenue,
        previous: prevRev.totalRevenue,
        changePercent: pctChange(curRev.totalRevenue, prevRev.totalRevenue),
      },
      totalCommission: {
        current: curRev.totalCommission,
        previous: prevRev.totalCommission,
        changePercent: pctChange(
          curRev.totalCommission,
          prevRev.totalCommission,
        ),
      },
      totalStudents: {
        current: currentStudentCount,
        previous: previousStudentCount,
        changePercent: pctChange(currentStudentCount, previousStudentCount),
      },
      totalInstructors: {
        current: currentInstructorCount,
        previous: previousInstructorCount,
        changePercent: pctChange(
          currentInstructorCount,
          previousInstructorCount,
        ),
      },
      totalCourses: {
        current: currentCourseCount,
        previous: previousCourseCount,
        changePercent: pctChange(currentCourseCount, previousCourseCount),
      },
    },
    revenueTrend,
    userGrowth,
    topCourses,
    recentUsers,
  };
};

// ─── Instructor Dashboard Types ───────────────────────────────────────────────

export interface InstructorSummaryCard {
  current: number;
  previous: number;
  changePercent: number | null;
}

/** One slice of the revenue-by-course donut chart. */
export interface CourseRevenueSlice {
  courseId: unknown;
  courseTitle: string;
  instructorRevenue: number;
}

/** One point on the enrollments trend line chart. */
export interface EnrollmentTrendPoint {
  label: string;
  newEnrollments: number;
}

/** Row in the Course Performance table. */
export interface InstructorCoursePerformance {
  _id: unknown;
  title: string;
  isVerified: boolean;
  totalStudentsEnrolled: number;
  averageRating: number;
  /** Average watchPercentage across all enrollments for this course (0-100). */
  avgCompletionPercent: number;
  /** Cumulative instructor revenue on this course (all-time). */
  totalRevenueInstructor: number;
}

/** Row in the Recent Reviews table. */
export interface InstructorRecentReview {
  _id: unknown;
  rating: number;
  feedback: string;
  courseTitle: string;
  studentName: string;
  createdAt: Date;
}

export interface InstructorDashboardData {
  period: string;
  summary: {
    totalRevenue: InstructorSummaryCard;
    totalAdminCommission: InstructorSummaryCard;
    totalStudents: InstructorSummaryCard;
    totalCourses: {
      live: number;
      pending: number;
    };
    averageRating: number;
  };
  revenueByCourseTrend: CourseRevenueSlice[];
  enrollmentTrend: EnrollmentTrendPoint[];
  coursePerformance: InstructorCoursePerformance[];
  recentReviews: InstructorRecentReview[];
}

// ─── Instructor Dashboard Service ────────────────────────────────────────────

export const getInstructorDashboardService = async (
  query: InstructorDashboardQuery,
  instructorId: string,
): Promise<InstructorDashboardData> => {
  const { period } = query;
  const instructorOid = new Types.ObjectId(instructorId);
  const {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    bucketFormat,
    buckets,
  } = getPeriodBounds(period);

  const [
    currentRevStats,
    previousRevStats,
    currentStudentCount,
    previousStudentCount,
    liveCourseCount,
    pendingCourseCount,
    overallRatingResult,
    revenueByCourseTrendRaw,
    enrollmentTrendRaw,
    coursePerformanceRaw,
    recentReviews,
  ] = await Promise.all([
    // 1. Current period — instructor revenue & admin commission
    TransactionModel.aggregate([
      {
        $match: {
          instructor: instructorOid,
          paymentStatus: "paid",
          amountPaidAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$instructorRevenue" },
          totalAdminCommission: { $sum: "$adminCommission" },
        },
      },
    ]),

    // 2. Previous period — instructor revenue & admin commission
    TransactionModel.aggregate([
      {
        $match: {
          instructor: instructorOid,
          paymentStatus: "paid",
          amountPaidAt: { $gte: previousStart, $lt: previousEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$instructorRevenue" },
          totalAdminCommission: { $sum: "$adminCommission" },
        },
      },
    ]),

    // 3. Current period — distinct students enrolled in instructor's courses
    EnrollmentModel.distinct("student", {
      instructor: instructorOid,
      createdAt: { $gte: currentStart, $lte: currentEnd },
    }),

    // 4. Previous period — distinct students
    EnrollmentModel.distinct("student", {
      instructor: instructorOid,
      createdAt: { $gte: previousStart, $lt: previousEnd },
    }),

    // 5. Live courses count
    CourseModel.countDocuments({
      instructor: instructorOid,
      isVerified: true,
      verificationRejectionReason: null,
    }),

    // 6. Pending courses count (submitted but not yet verified/rejected)
    CourseModel.countDocuments({
      instructor: instructorOid,
      isVerified: false,
      verificationRejectionReason: null,
    }),

    // 7. Overall average rating across all instructor's courses
    CourseModel.aggregate<{ avgRating: number }>([
      {
        $match: {
          instructor: instructorOid,
          isVerified: true,
          totalReviews: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$averageRating" },
        },
      },
    ]),

    // 8. Revenue by course (donut) — current period
    TransactionModel.aggregate<{ _id: unknown; courseTitle: string; instructorRevenue: number }>([
      {
        $match: {
          instructor: instructorOid,
          paymentStatus: "paid",
          amountPaidAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: "$course",
          instructorRevenue: { $sum: "$instructorRevenue" },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseDoc",
        },
      },
      { $unwind: { path: "$courseDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseTitle: { $ifNull: ["$courseDoc.title", "Unknown"] },
          instructorRevenue: 1,
        },
      },
      { $sort: { instructorRevenue: -1 } },
      { $limit: 8 },
    ]),

    // 9. Enrollment trend — bucketed by period
    EnrollmentModel.aggregate<{ _id: string; newEnrollments: number }>([
      {
        $match: {
          instructor: instructorOid,
          createdAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: bucketFormat, date: "$createdAt" },
          },
          newEnrollments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 10. Course performance table — top 5 instructor courses
    CourseModel.aggregate<InstructorCoursePerformance>([
      { $match: { instructor: instructorOid } },
      { $sort: { totalStudentsEnrolled: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $project: {
          title: 1,
          isVerified: 1,
          totalStudentsEnrolled: 1,
          averageRating: 1,
          totalRevenueInstructor: 1,
          avgCompletionPercent: {
            $cond: [
              { $gt: [{ $size: "$enrollments" }, 0] },
              {
                $round: [{ $avg: "$enrollments.watchPercentage" }, 1],
              },
              0,
            ],
          },
        },
      },
    ]),

    // 11. Recent 5 reviews for this instructor
    ReviewModel.aggregate<InstructorRecentReview>([
      { $match: { instructor: instructorOid } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "reviewBy",
          foreignField: "_id",
          as: "studentDoc",
        },
      },
      { $unwind: { path: "$studentDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseDoc",
        },
      },
      { $unwind: { path: "$courseDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          rating: 1,
          feedback: 1,
          createdAt: 1,
          courseTitle: { $ifNull: ["$courseDoc.title", "Unknown"] },
          studentName: { $ifNull: ["$studentDoc.fullName", "Unknown"] },
        },
      },
    ]),
  ]);

  // ── Extract scalars ────────────────────────────────────────────────────────

  const curRev = currentRevStats[0] ?? { totalRevenue: 0, totalAdminCommission: 0 };
  const prevRev = previousRevStats[0] ?? { totalRevenue: 0, totalAdminCommission: 0 };
  const avgRating = overallRatingResult[0]?.avgRating
    ? Math.round(overallRatingResult[0].avgRating * 10) / 10
    : 0;

  // ── Fill enrollment trend buckets ─────────────────────────────────────────

  const enrollMap = new Map(enrollmentTrendRaw.map((r) => [r._id, r.newEnrollments]));
  const enrollmentTrend: EnrollmentTrendPoint[] = buckets.map((label) => ({
    label,
    newEnrollments: enrollMap.get(label) ?? 0,
  }));

  // ── Shape revenue-by-course slices ────────────────────────────────────────

  const revenueByCourseTrend: CourseRevenueSlice[] = revenueByCourseTrendRaw.map((r) => ({
    courseId: r._id,
    courseTitle: r.courseTitle,
    instructorRevenue: r.instructorRevenue,
  }));

  return {
    period,
    summary: {
      totalRevenue: {
        current: curRev.totalRevenue,
        previous: prevRev.totalRevenue,
        changePercent: pctChange(curRev.totalRevenue, prevRev.totalRevenue),
      },
      totalAdminCommission: {
        current: curRev.totalAdminCommission,
        previous: prevRev.totalAdminCommission,
        changePercent: pctChange(curRev.totalAdminCommission, prevRev.totalAdminCommission),
      },
      totalStudents: {
        current: currentStudentCount.length,
        previous: previousStudentCount.length,
        changePercent: pctChange(currentStudentCount.length, previousStudentCount.length),
      },
      totalCourses: {
        live: liveCourseCount,
        pending: pendingCourseCount,
      },
      averageRating: avgRating,
    },
    revenueByCourseTrend,
    enrollmentTrend,
    coursePerformance: coursePerformanceRaw,
    recentReviews,
  };
};

// ─── Student Dashboard Types ───────────────────────────────────────────────

/** Summary card for the student dashboard (no comparison period needed). */
export interface StudentSummaryCards {
  /** Total number of courses the student is enrolled in (all-time). */
  totalEnrolledCourses: number;
  /** Courses where watchedCompletely is true. */
  completedCourses: number;
  /** Courses where watchedCompletely is false (i.e. still in progress). */
  activeCourses: number;
  /** Average watchPercentage across all active (non-completed) enrollments, 0-100. */
  overallProgressPercent: number;
  /** Sum of totalDurationWatchedInMinutes across all enrollments. */
  totalWatchTimeInMinutes: number;
}

/** One card in the "Continue Watching" section. */
export interface ContinueWatchingItem {
  enrollmentId: unknown;
  courseId: unknown;
  courseTitle: string;
  courseSlug: string;
  courseLevel: string;
  courseThumbnailUrl: string | null;
  instructorName: string;
  totalDurationInMinutes: number;
  totalDurationWatchedInMinutes: number;
  watchPercentage: number;
}

export type ActivityEventType = "enrolled" | "completed" | "certificate_earned";

/** One row in the "Recent Activity" table. */
export interface StudentActivityEvent {
  type: ActivityEventType;
  courseTitle: string;
  courseId: unknown;
  /** ISO-8601 timestamp of the event. */
  occurredAt: Date;
}

export interface StudentDashboardData {
  period?: string;
  summary: StudentSummaryCards;
  /** Up to 3 most-recently-accessed in-progress courses (sorted by updatedAt desc). */
  continueWatching: ContinueWatchingItem[];
  /** Up to 5 most recent activity events merged from enrolled, completed, certificate events. */
  recentActivity: StudentActivityEvent[];
}

// ─── Student Dashboard Service ───────────────────────────────────────────

export const getStudentDashboardService = async (
  query: StudentDashboardQuery,
  studentId: string,
): Promise<StudentDashboardData> => {
  const studentOid = new Types.ObjectId(studentId);
  const { period } = query;
  const { currentStart, currentEnd } = getPeriodBounds(period);

  // Summary and Recent Activity filters:
  // - continueWatching is NOT affected by the period filter (always shows current in-progress courses)
  // - summary and recentActivity ARE filtered by period
  const summaryMatch: Record<string, any> = { student: studentOid };
  const enrolledMatch: Record<string, any> = { student: studentOid };
  const completedMatch: Record<string, any> = {
    student: studentOid,
    watchedCompletely: true,
    watchedCompletelyAt: { $ne: null },
  };
  const certMatch: Record<string, any> = {
    student: studentOid,
    certificateIssued: true,
    certificateIssuedAt: { $ne: null },
  };

  summaryMatch.createdAt = { $gte: currentStart, $lte: currentEnd };
  enrolledMatch.createdAt = { $gte: currentStart, $lte: currentEnd };
  completedMatch.watchedCompletelyAt = { $gte: currentStart, $lte: currentEnd };
  certMatch.certificateIssuedAt = { $gte: currentStart, $lte: currentEnd };

  const [
    summaryRaw,
    continueWatchingRaw,
    enrolledEventsRaw,
    completedEventsRaw,
    certificateEventsRaw,
  ] = await Promise.all([
    // 1. Summary aggregation — filtered by period
    EnrollmentModel.aggregate<{
      totalEnrolledCourses: number;
      completedCourses: number;
      activeCourses: number;
      overallProgressPercent: number;
      totalWatchTimeInMinutes: number;
    }>([
      { $match: summaryMatch },
      {
        $group: {
          _id: null,
          totalEnrolledCourses: { $sum: 1 },
          completedCourses: {
            $sum: { $cond: ["$watchedCompletely", 1, 0] },
          },
          activeCourses: {
            $sum: { $cond: ["$watchedCompletely", 0, 1] },
          },
          totalWatchTimeInMinutes: { $sum: "$totalDurationWatchedInMinutes" },
          // Watch percentages of active-only courses
          activeWatchPercentages: {
            $push: {
              $cond: [
                { $eq: ["$watchedCompletely", false] },
                "$watchPercentage",
                "$$REMOVE",
              ],
            },
          },
        },
      },
      {
        $project: {
          totalEnrolledCourses: 1,
          completedCourses: 1,
          activeCourses: 1,
          totalWatchTimeInMinutes: {
            $round: ["$totalWatchTimeInMinutes", 1],
          },
          overallProgressPercent: {
            $cond: [
              { $gt: [{ $size: "$activeWatchPercentages" }, 0] },
              {
                $round: [{ $avg: "$activeWatchPercentages" }, 1],
              },
              {
                $cond: [{ $gt: ["$completedCourses", 0] }, 100, 0],
              },
            ],
          },
        },
      },
    ]),

    // 2. Continue watching — top 3 in-progress courses with watchPercentage > 0 (NOT affected by period)
    EnrollmentModel.aggregate<ContinueWatchingItem>([
      {
        $match: {
          student: studentOid,
          watchedCompletely: false,
          watchPercentage: { $gt: 0 },
        },
      },
      { $sort: { mostRecentlySeen: -1, updatedAt: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseDoc",
        },
      },
      { $unwind: { path: "$courseDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "courseDoc.instructor",
          foreignField: "_id",
          as: "instructorDoc",
        },
      },
      { $unwind: { path: "$instructorDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          enrollmentId: "$_id",
          courseId: "$courseDoc._id",
          courseTitle: { $ifNull: ["$courseDoc.title", "Unknown"] },
          courseSlug: { $ifNull: ["$courseDoc.slug", ""] },
          courseLevel: { $ifNull: ["$courseDoc.level", "beginner"] },
          courseThumbnailKey: { $ifNull: ["$courseDoc.thumbnailKey", null] },
          instructorName: { $ifNull: ["$instructorDoc.fullName", "Unknown"] },
          totalDurationInMinutes: { $ifNull: ["$courseDoc.totalDurationInMinutes", 0] },
          totalDurationWatchedInMinutes: 1,
          watchPercentage: 1,
        },
      },
    ]),

    // 3. Recent enrolled events (filtered by period)
    EnrollmentModel.find(enrolledMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("course createdAt")
      .populate<{ course: { _id: unknown; title: string } | null }>({
        path: "course",
        select: "title",
      })
      .lean(),

    // 4. Recent completed events (filtered by period)
    EnrollmentModel.find(completedMatch)
      .sort({ watchedCompletelyAt: -1 })
      .limit(5)
      .select("course watchedCompletelyAt")
      .populate<{ course: { _id: unknown; title: string } | null }>({
        path: "course",
        select: "title",
      })
      .lean(),

    // 5. Recent certificate events (filtered by period)
    EnrollmentModel.find(certMatch)
      .sort({ certificateIssuedAt: -1 })
      .limit(5)
      .select("course certificateIssuedAt")
      .populate<{ course: { _id: unknown; title: string } | null }>({
        path: "course",
        select: "title",
      })
      .lean(),
  ]);

  // ── Summary ────────────────────────────────────────────────────────────

  const summary: StudentSummaryCards = summaryRaw[0] ?? {
    totalEnrolledCourses: 0,
    completedCourses: 0,
    activeCourses: 0,
    overallProgressPercent: 0,
    totalWatchTimeInMinutes: 0,
  };

  // ── Continue Watching ─────────────────────────────────────────────────

  const continueWatching: ContinueWatchingItem[] = continueWatchingRaw.map(
    (item: any) => ({
      ...item,
      courseThumbnailUrl: item.courseThumbnailKey
        ? getPublicS3Url(item.courseThumbnailKey)
        : null,
      courseThumbnailKey: undefined,
    }),
  );

  // ── Recent Activity ─────────────────────────────────────────────────
  // Merge the three event streams, sort by occurredAt desc, take top 5.

  const enrolledEvents: StudentActivityEvent[] = enrolledEventsRaw.map(
    (e: any) => ({
      type: "enrolled" as ActivityEventType,
      courseTitle: e.course?.title ?? "Unknown",
      courseId: e.course?._id ?? null,
      occurredAt: e.createdAt,
    }),
  );

  const completedEvents: StudentActivityEvent[] = completedEventsRaw.map(
    (e: any) => ({
      type: "completed" as ActivityEventType,
      courseTitle: e.course?.title ?? "Unknown",
      courseId: e.course?._id ?? null,
      occurredAt: e.watchedCompletelyAt,
    }),
  );

  const certificateEvents: StudentActivityEvent[] = certificateEventsRaw.map(
    (e: any) => ({
      type: "certificate_earned" as ActivityEventType,
      courseTitle: e.course?.title ?? "Unknown",
      courseId: e.course?._id ?? null,
      occurredAt: e.certificateIssuedAt,
    }),
  );

  const recentActivity = [...enrolledEvents, ...completedEvents, ...certificateEvents]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 5);

  return {
    period,
    summary,
    continueWatching,
    recentActivity,
  };
};
