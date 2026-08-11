import { redisClient } from "@src/config/redis";

export const getCache = async <T>(key: string): Promise<T | null> => {
  const cached = await redisClient.get(key);

  if (!cached) return null;

  return JSON.parse(cached) as T;
};

export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> => {
  await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const deleteCache = async (key: string): Promise<void> => {
  await redisClient.del(key);
};

export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  const keys = await redisClient.keys(pattern);

  if (keys.length === 0) return;

  await redisClient.del(keys);
};
