import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "crateraters",
  secretKey: process.env.MINIO_SECRET_KEY || "crateraters",
});

const BUCKET = process.env.MINIO_BUCKET || "crateraters";

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    await minioClient.setBucketPolicy(
      BUCKET,
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          },
        ],
      }),
    );
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return key;
}

export function getFileUrl(key: string): string {
  const endpoint = process.env.MINIO_ENDPOINT || "localhost";
  const port = process.env.MINIO_PORT || "9000";
  return `http://${endpoint}:${port}/${BUCKET}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET, key);
}
