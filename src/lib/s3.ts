import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  // The bucket name contains dots (e.g. "z-academy-5.0-3"), which breaks the
  // virtual-hosted-style cert (`*.s3.<region>.amazonaws.com` only covers one
  // subdomain level) with NET::ERR_CERT_COMMON_NAME_INVALID. Path-style
  // addressing avoids that for every generated URL (presigned POST/GET).
  forcePathStyle: true,
});
