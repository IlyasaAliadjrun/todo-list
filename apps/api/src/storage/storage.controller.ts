import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  PresignUploadInputSchema,
  type PresignUploadInput,
  type PresignUploadResponse,
} from "@notion/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { StorageService } from "./storage.service";

@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Minta presigned PUT URL untuk upload gambar langsung ke object storage. */
  @Post("presign")
  presign(
    @Body(new ZodValidationPipe(PresignUploadInputSchema)) dto: PresignUploadInput,
  ): Promise<PresignUploadResponse> {
    return this.storage.presignUpload(dto);
  }
}
