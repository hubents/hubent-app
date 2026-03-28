import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Helper function to get env vars at RUNTIME (not build time)
function getR2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

// Create S3 client for R2 - reads env vars at runtime
function getR2Client() {
  const config = getR2Config();
  
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    console.error("R2 missing credentials:", {
      hasAccountId: !!config.accountId,
      hasAccessKeyId: !!config.accessKeyId,
      hasSecretAccessKey: !!config.secretAccessKey,
    });
    return null;
  }
  
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToR2(
  file: Buffer | Uint8Array,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string } | null> {
  const config = getR2Config();
  const client = getR2Client();
  
  if (!client || !config.bucketName || !config.publicUrl) {
    console.error("R2 is not configured. Missing:", {
      hasClient: !!client,
      hasBucketName: !!config.bucketName,
      hasPublicUrl: !!config.publicUrl,
    });
    return null;
  }

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    const url = `${config.publicUrl}/${key}`;
    return { url, key };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "Unknown";
    console.error("R2 upload error:", errorName, errorMessage, error);
    throw new Error(`R2 Error: ${errorName} - ${errorMessage}`);
  }
}

export async function deleteFromR2(key: string): Promise<boolean> {
  const config = getR2Config();
  const client = getR2Client();
  
  if (!client || !config.bucketName) {
    console.error("R2 is not configured");
    return false;
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error("R2 delete error:", error);
    return false;
  }
}

/**
 * Extract the R2 object key from a full public URL.
 * e.g. "https://pub-xxx.r2.dev/uploads/123-file.pdf" → "uploads/123-file.pdf"
 */
export function extractR2Key(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl || !url.startsWith(publicUrl)) return null;
  return url.slice(publicUrl.length + 1); // +1 for the trailing "/"
}

/**
 * Delete an R2 object by its public URL (fire-and-forget safe).
 */
export async function deleteR2ByUrl(url: string): Promise<void> {
  const key = extractR2Key(url);
  if (key) {
    deleteFromR2(key).catch((err) =>
      console.error("R2 cleanup failed for key:", key, err)
    );
  }
}

export function isR2Configured(): boolean {
  const config = getR2Config();
  return !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName && config.publicUrl);
}

// Generate a presigned URL for direct client upload to R2
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  const config = getR2Config();
  const client = getR2Client();
  
  if (!client || !config.bucketName || !config.publicUrl) {
    console.error("R2 is not configured for presigned URL");
    return null;
  }

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL valid for 10 minutes
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicUrl = `${config.publicUrl}/${key}`;

    return { uploadUrl, publicUrl, key };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return null;
  }
}
