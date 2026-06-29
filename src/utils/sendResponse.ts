import { Response } from "express";

interface ApiResponse {
  status: "success" | "fail" | "error";
  message: string;
  data: unknown;
}

const sendResponse = (
  res: Response,
  statusCode: number,
  body: ApiResponse,
): void => {
  res.status(statusCode).json(body);
};

export default sendResponse;
export type { ApiResponse };
