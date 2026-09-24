import { Router } from "express";
import { getPlatformStats } from "../controllers/statController";

const statRouter = Router();

statRouter.get("/", getPlatformStats);

export default statRouter;
