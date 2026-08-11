import Redis from "ioredis";
import { env } from "@src/config/env";

export const redisClient = new Redis(env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("Redis Connected");
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error);
});
