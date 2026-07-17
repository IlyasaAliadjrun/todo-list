import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  CreateDatabaseInputSchema,
  CreatePropertyInputSchema,
  MoveInputSchema,
  RowAttachmentsSchema,
  RowContentSchema,
  UpdateCellInputSchema,
  UpdateDatabaseInputSchema,
  CreateViewInputSchema,
  UpdateViewInputSchema,
  SetActiveViewInputSchema,
  UpdatePropertyInputSchema,
  UpdateRowInputSchema,
  type CreateDatabaseInput,
  type CreatePropertyInput,
  type Database,
  type MoveInput,
  type RowAttachments,
  type RowContent,
  type UpdateCellInput,
  type UpdateDatabaseInput,
  type CreateViewInput,
  type UpdateViewInput,
  type SetActiveViewInput,
  type UpdatePropertyInput,
  type UpdateRowInput,
} from "@notion/shared";
import { AuthenticatedUser } from "../auth/auth.constants";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DatabaseService } from "./database.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class DatabaseController {
  constructor(private readonly db: DatabaseService) {}

  @Post("databases")
  create(
    @Body(new ZodValidationPipe(CreateDatabaseInputSchema)) dto: CreateDatabaseInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.create(user.id, dto);
  }

  @Get("databases/:id")
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<Database> {
    return this.db.getDatabase(id, user.id);
  }

  @Patch("databases/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateDatabaseInputSchema)) dto: UpdateDatabaseInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.updateDatabase(id, user.id, dto.title);
  }

  @Post("databases/:id/views")
  createView(
    @Param("id") databaseId: string,
    @Body(new ZodValidationPipe(CreateViewInputSchema)) dto: CreateViewInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.createView(databaseId, user.id, dto);
  }

  @Patch("databases/:id/active-view")
  setActiveView(
    @Param("id") databaseId: string,
    @Body(new ZodValidationPipe(SetActiveViewInputSchema)) dto: SetActiveViewInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.setActiveView(databaseId, user.id, dto.viewId);
  }

  @Patch("views/:id")
  updateView(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateViewInputSchema)) dto: UpdateViewInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.updateView(id, user.id, dto);
  }

  @Delete("views/:id")
  deleteView(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<Database> {
    return this.db.deleteView(id, user.id);
  }

  @Delete("databases/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.db.deleteDatabase(id, user.id);
  }

  @Post("databases/:id/properties")
  addProperty(
    @Param("id") databaseId: string,
    @Body(new ZodValidationPipe(CreatePropertyInputSchema)) dto: CreatePropertyInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.addProperty(databaseId, user.id, dto);
  }

  @Patch("properties/:id")
  updateProperty(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdatePropertyInputSchema)) dto: UpdatePropertyInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.updateProperty(id, user.id, dto);
  }

  @Post("properties/:id/move")
  moveProperty(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(MoveInputSchema)) dto: MoveInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.moveProperty(id, user.id, dto.afterId ?? null);
  }

  @Delete("properties/:id")
  deleteProperty(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.deleteProperty(id, user.id);
  }

  @Post("databases/:id/rows")
  addRow(
    @Param("id") databaseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.addRow(databaseId, user.id);
  }

  @Post("rows/:id/move")
  moveRow(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(MoveInputSchema)) dto: MoveInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.moveRow(id, user.id, dto.afterId ?? null);
  }

  @Patch("rows/:id")
  updateRow(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateRowInputSchema)) dto: UpdateRowInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.updateRow(id, user.id, dto);
  }

  @Delete("rows/:id")
  deleteRow(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<Database> {
    return this.db.deleteRow(id, user.id);
  }

  @Get("rows/:id/content")
  getRowContent(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ content: unknown }> {
    return this.db.getRowContent(id, user.id);
  }

  @Put("rows/:id/content")
  @HttpCode(HttpStatus.NO_CONTENT)
  setRowContent(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RowContentSchema)) dto: RowContent,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.db.setRowContent(id, user.id, dto.content);
  }

  @Get("rows/:id/attachments")
  getRowAttachments(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ attachments: unknown }> {
    return this.db.getRowAttachments(id, user.id);
  }

  @Put("rows/:id/attachments")
  @HttpCode(HttpStatus.NO_CONTENT)
  setRowAttachments(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RowAttachmentsSchema)) dto: RowAttachments,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.db.setRowAttachments(id, user.id, dto.attachments);
  }

  @Put("rows/:rowId/cells/:propertyId")
  setCell(
    @Param("rowId") rowId: string,
    @Param("propertyId") propertyId: string,
    @Body(new ZodValidationPipe(UpdateCellInputSchema)) dto: UpdateCellInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Database> {
    return this.db.setCell(rowId, propertyId, user.id, dto.value);
  }
}
