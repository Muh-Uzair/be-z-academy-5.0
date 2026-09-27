import TransactionModel from "../models/transactionModel";
import UserModel from "../models/userModel";
import CourseModel from "../models/courseModel";
import { AdminDashboardQuery } from "../types/dashboardType";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a period ("week" | "month" | "year"), returns:
 *  - currentStart / currentEnd: the current window
 *  - previousStart / previousEnd: the previous window of the same length
 *  - bucketFormat: a MongoDB dateToString format string for grouping chart data
 *  - buckets: ordered label strings for the chart x-axis
 */
function getPeriodBounds(period: AdminDashboardQuery["period"]) {
  const now = new Date();
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let bucketFormat: string;
  let buckets: string[];

  if (period === "week") {
    // Current week: last 7 days (today included)
    currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - 6);

    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    previousEnd = new Date(currentStart);

    bucketFormat = "%Y-%m-%d";

    // Build 7 day labels: oldest → newest
    buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  } else if (period === "month") {
    // Current month: last 30 days
    currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - 29);

    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);
    previousEnd = new Date(currentStart);

    // Group by week number within the 30-day window (5 weekly buckets, labelled Week 1…5)
    bucketFormat = "%Y-%U"; // ISO year + week number

    buckets = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(currentStart);
      d.setDate(d.getDate() + i * 7);
      // Format: "2026-35"
      const year = d.getFullYear();
      const week = getISOWeek(d);
      return `${year}-${String(week).padStart(2, "0")}`;
    });
  } else {
    // year: last 12 calendar months
    currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    previousStart = new Date(
      currentStart.getFullYear() - 1,
      currentStart.getMonth(),
      1,
    );
    previousEnd = new Date(currentStart);

    bucketFormat = "%Y-%m";

    // Build 12 month labels: oldest → newest
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentStart);
      d.setMonth(d.getMonth() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }

  const currentEnd = new Date(now);
  currentEnd.setHours(23, 59, 59, 999);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    bucketFormat,
    buckets,
  };
}

/** Returns ISO week number for a given date (1–53). */
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
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

    // 12. 10 most recently joined users (any role)
    UserModel.find()
      .sort({ createdAt: -1 })
      .limit(10)
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
