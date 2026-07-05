import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3Client } from "@src/config/s3";
import { env } from "@src/config/env";

export const getPresignedPutUrlService = async (
  key: string,
  fileType: string,
): Promise<{ uploadUrl: string; key: string }> => {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  return { uploadUrl, key };
};

export const getPresignedPostUrlService = async (
  key: string,
  fileType: string,
  maxSizeInBytes: number,
): Promise<{
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}> => {
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
    Expires: 900,
  });

  return { uploadUrl: url, fields, key };
};

export const getPublicS3Url = (key: string): string => {
  return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};
