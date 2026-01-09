import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Create S3 client for R2
function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }
  
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function uploadToR2(
  file: Buffer | Uint8Array,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string } | null> {
  const client = getR2Client();
  
  if (!client || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    console.error("R2 is not configured. Missing environment variables.");
    return null;
  }

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    // Return public URL
    const url = `${R2_PUBLIC_URL}/${key}`;
    return { url, key };
  } catch (error) {
    console.error("R2 upload error:", error);
    return null;
  }
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  
  if (!client || !R2_BUCKET_NAME) {
    console.error("R2 is not configured");
    return false;
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error("R2 delete error:", error);
    return false;
  }
}

export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_PUBLIC_URL);
}
