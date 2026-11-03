import { Router } from "express";
import { getPlatformStats } from "../controllers/statController";

const statRouter = Router();

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/stats
// Api # 1
statRouter.get("/", getPlatformStats);

export default statRouter;
