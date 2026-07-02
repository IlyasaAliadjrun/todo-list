import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ErrorCode } from "@notion/shared";
import type { ZodSchema } from "zod";

/**
 * Pipe validasi berbasis Zod. Pakai skema dari @notion/shared:
 *   @Body(new ZodValidationPipe(CreateWorkspaceSchema)) dto: CreateWorkspaceInput
 * Melempar 400 dengan detail issue bila input tidak valid.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION,
        message: "Input tidak valid",
        message_details: result.error.issues,
      });
    }
    return result.data;
  }
}
