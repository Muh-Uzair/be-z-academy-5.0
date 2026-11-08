import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => {
  console.log("Redis Connected successfully");
});

redis.on("error", (err) => {
  console.warn("Redis connection warning:", err.message);
});

export default redis;

