import CourseModel from "../models/courseModel";
import EnrollmentModel from "../models/enrollmentModel";

export const getPlatformStatsService = async (): Promise<{
  totalStudents: number;
  totalCourses: number;
}> => {
  // Count of distinct student IDs in the enrollments collection
  // (this exactly represents users who are students AND have at least 1 course enrollment)
  const distinctStudents = await EnrollmentModel.distinct("student");
  const totalStudents = distinctStudents.length;

  // Count of all verified courses
  const totalCourses = await CourseModel.countDocuments({
    isVerified: true,
    verificationRejectionReason: null,
  });

  return { totalStudents, totalCourses };
};
