import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
