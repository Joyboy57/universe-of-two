import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const Bucket = process.env.R2_BUCKET!;

/** Short-lived URL the browser uses to upload directly to R2. */
export function signUpload(key: string, contentType: string, seconds = 300) {
  return getSignedUrl(r2, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), {
    expiresIn: seconds,
  });
}

/** Short-lived URL for viewing a private object. */
export function signView(key: string, seconds = 600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: seconds });
}
