import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  isAllowedUploadType,
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
  /** Cache S3Client per endpoint (endpoint bergantung host request bila tak di-override). */
  private readonly clients = new Map<string, S3Client>();

  private clientFor(endpoint: string): S3Client {
    let c = this.clients.get(endpoint);
    if (!c) {
      c = new S3Client({
        endpoint,
        region: this.env.S3_REGION,
        forcePathStyle: this.env.S3_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: this.env.S3_ACCESS_KEY,
          secretAccessKey: this.env.S3_SECRET_KEY,
        },
      });
      this.clients.set(endpoint, c);
    }
    return c;
  }

  /**
   * Endpoint object storage yang diakses BROWSER.
   * - Bila `S3_PUBLIC_ENDPOINT` di-set (produksi) → pakai itu (host storage tetap).
   * - Selain itu (dev/LAN) → turunkan dari host request supaya presigned URL menunjuk
   *   ke host yang sama dengan yang dibuka browser (mis. 10.101.18.14) di port S3,
   *   bukan `localhost` yang tak terjangkau dari mesin lain.
   */
  private publicEndpoint(reqOrigin?: string): string {
    if (this.env.S3_PUBLIC_ENDPOINT) return this.env.S3_PUBLIC_ENDPOINT;
    if (reqOrigin) {
      try {
        const req = new URL(reqOrigin);
        const s3 = new URL(this.env.S3_ENDPOINT);
        return `${req.protocol}//${req.hostname}:${s3.port || "9000"}`;
      } catch {
        /* fallthrough */
      }
    }
    return this.env.S3_ENDPOINT;
  }

  private extensionOf(filename: string): string {
    const match = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
    return match ? `.${match[1].toLowerCase()}` : "";
  }

  /** @param reqOrigin origin/host yang dipakai browser (mis. dari header Origin/Host). */
  async presignUpload(
    input: PresignUploadInput,
    reqOrigin?: string,
  ): Promise<PresignUploadResponse> {
    if (!isAllowedUploadType(input.contentType)) {
      throw new BadRequestException("Tipe file tidak diperbolehkan");
    }
    if (input.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("Ukuran file melebihi batas 10MB");
    }

    const endpoint = this.publicEndpoint(reqOrigin);
    const key = `uploads/${randomUUID()}${this.extensionOf(input.filename)}`;
    const command = new PutObjectCommand({
      Bucket: this.env.S3_BUCKET,
      Key: key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.clientFor(endpoint), command, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });

    // Path-style public URL (bucket sudah di-set anonymous download oleh minio-init).
    const publicUrl = `${endpoint.replace(/\/$/, "")}/${this.env.S3_BUCKET}/${key}`;

    return { uploadUrl, publicUrl, key };
  }
}
