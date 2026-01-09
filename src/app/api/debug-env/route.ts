import { NextResponse } from "next/server";

// TEMPORARY DEBUG ENDPOINT - DELETE AFTER FIXING
export async function GET() {
  return NextResponse.json({
    r2: {
      hasAccountId: !!process.env.R2_ACCOUNT_ID,
      hasAccessKeyId: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretAccessKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasBucketName: !!process.env.R2_BUCKET_NAME,
      hasPublicUrl: !!process.env.R2_PUBLIC_URL,
      // Show first 4 chars to verify they're correct
      accountIdPrefix: process.env.R2_ACCOUNT_ID?.substring(0, 4) || "MISSING",
      bucketName: process.env.R2_BUCKET_NAME || "MISSING",
    },
    vercelBlob: {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    },
    nodeEnv: process.env.NODE_ENV,
  });
}
