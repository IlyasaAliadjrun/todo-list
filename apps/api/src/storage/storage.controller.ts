import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import {
  PresignUploadInputSchema,
  type PresignUploadInput,
  type PresignUploadResponse,
} from "@notion/shared";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StorageService } from "./storage.service";

@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Minta presigned PUT URL untuk upload file langsung ke object storage. */
  @Post("presign")
  presign(
    @Body(new ZodValidationPipe(PresignUploadInputSchema)) dto: PresignUploadInput,
    @Req() req: Request,
  ): Promise<PresignUploadResponse> {
    // Origin browser (agar presigned URL menunjuk host yang sama, bukan localhost).
    const origin =
      req.headers.origin ?? (req.headers.host ? `${req.protocol}://${req.headers.host}` : undefined);
    return this.storage.presignUpload(dto, origin);
  }
}
