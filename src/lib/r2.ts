import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

    // Return public URL
    const url = `${config.publicUrl}/${key}`;
    return { url, key };
  } catch (error) {
    console.error("R2 upload error:", error);
    return null;
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

export function isR2Configured(): boolean {
  const config = getR2Config();
  return !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName && config.publicUrl);
}
