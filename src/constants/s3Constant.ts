export const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const PRESIGNED_POST_EXPIRES_IN_SECONDS = 900;
export const PRESIGNED_GET_DEFAULT_EXPIRES_IN_SECONDS = 3600;

export const USER_AVATAR_S3_FOLDER = "user-avatars";
export const USER_MAX_AVATAR_SIZE_IN_BYTES = 5 * 1024 * 1024; // 5MB
