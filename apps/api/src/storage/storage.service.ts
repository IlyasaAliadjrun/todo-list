import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ALLOWED_UPLOAD_PREFIX,
  MAX_UPLOAD_BYTES,
  type PresignUploadInput,
  type PresignUploadResponse,
} from "@notion/shared";
import { randomUUID } from "node:crypto";
import { loadEnv, type Env } from "../config/env";

const PRESIGN_TTL_SECONDS = 300;

@Injectable()
export class StorageService {
  private readonly env: Env = loadEnv();
  private readonly client: S3Client;
  /** Endpoint yang diakses browser (untuk presigned & publicUrl). */
  private readonly publicEndpoint: string;

  constructor() {
    this.publicEndpoint = this.env.S3_PUBLIC_ENDPOINT ?? this.env.S3_ENDPOINT;
    this.client = new S3Client({
      endpoint: this.publicEndpoint,
      region: this.env.S3_REGION,
      forcePathStyle: this.env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: this.env.S3_ACCESS_KEY,
        secretAccessKey: this.env.S3_SECRET_KEY,
      },
    });
  }

  private extensionOf(filename: string): string {
    const match = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
    return match ? `.${match[1].toLowerCase()}` : "";
  }

  async presignUpload(input: PresignUploadInput): Promise<PresignUploadResponse> {
    if (!input.contentType.startsWith(ALLOWED_UPLOAD_PREFIX)) {
      throw new BadRequestException("Hanya file gambar yang diperbolehkan");
    }
    if (input.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("Ukuran file melebihi batas 10MB");
    }

    const key = `uploads/${randomUUID()}${this.extensionOf(input.filename)}`;
    const command = new PutObjectCommand({
      Bucket: this.env.S3_BUCKET,
      Key: key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: PRESIGN_TTL_SECONDS });

    // Path-style public URL (bucket sudah di-set anonymous download oleh minio-init).
    const publicUrl = `${this.publicEndpoint.replace(/\/$/, "")}/${this.env.S3_BUCKET}/${key}`;

    return { uploadUrl, publicUrl, key };
  }
}
