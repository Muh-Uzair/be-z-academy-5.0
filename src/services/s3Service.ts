import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3Client } from "@src/config/s3";
import { env } from "@src/config/env";
import {
  MIME_TYPE_TO_EXTENSION,
  PRESIGNED_POST_EXPIRES_IN_SECONDS,
  PRESIGNED_GET_DEFAULT_EXPIRES_IN_SECONDS,
} from "@src/constants/s3Constant";

// FUNCTION
export const buildS3ObjectKey = (
  folder: string,
  fileName: string,
  fileType: string,
  uniqueId: string,
): string => {
  // Step 1: Strip any extension the client may have already included
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  // Step 2: Derive the correct extension from the validated MIME type
  const extension = MIME_TYPE_TO_EXTENSION[fileType];

  return `${folder}/${uniqueId}-${baseName}.${extension}`;
};

// FUNCTION
export const getPresignedPostUrlService = async (
  key: string,
  fileType: string,
  maxSizeInBytes: number,
): Promise<{
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}> => {
  // Step 1: Build a presigned POST policy that enforces content type and max size
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    Conditions: [
      ["content-length-range", 0, maxSizeInBytes],
      ["eq", "$Content-Type", fileType],
    ],
    Fields: {
      "Content-Type": fileType,
    },
    Expires: PRESIGNED_POST_EXPIRES_IN_SECONDS,
  });

  // Step 2: Return the form fields the client must submit alongside the file
  return { uploadUrl: url, fields, key };
};

// FUNCTION
export const getPresignedGetUrlService = async (
  key: string,
  expiresIn = PRESIGNED_GET_DEFAULT_EXPIRES_IN_SECONDS,
): Promise<string> => {
  // Step 1: Build the GET command for the private object
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  // Step 2: Sign the command into a time-limited read URL
  return getSignedUrl(s3Client, command, { expiresIn });
};

// FUNCTION
export const deleteS3ObjectService = async (key: string): Promise<void> => {
  // Step 1: Build the delete command for the given key
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  // Step 2: Send the delete request to S3
  await s3Client.send(command);
};

// FUNCTION
export const getPublicS3Url = (key: string): string => {
  return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};
