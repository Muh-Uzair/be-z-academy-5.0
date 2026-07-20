import { randomUUID } from "crypto";

export const buildSlug = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${randomUUID().slice(0, 8)}`;
};
