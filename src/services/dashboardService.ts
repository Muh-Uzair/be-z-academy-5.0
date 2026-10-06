import { DashboardPeriod, DashboardAuthUser } from "../types/dashboardType";

// FUNCTION
export const getAdminDashboardService = async (
  user: DashboardAuthUser | undefined,
  period: DashboardPeriod,
): Promise<null> => {
  console.log("user -----------------", user);
  console.log("period ---------------------", period);

  return null;
};

// FUNCTION
export const getInstructorDashboardService = async (
  user: DashboardAuthUser | undefined,
  period: DashboardPeriod,
): Promise<null> => {
  console.log("user -----------------", user);
  console.log("period ---------------------", period);

  return null;
};

// FUNCTION
export const getStudentDashboardService = async (
  user: DashboardAuthUser | undefined,
  period: DashboardPeriod,
): Promise<null> => {
  console.log("user -----------------", user);
  console.log("period ---------------------", period);

  return null;
};
