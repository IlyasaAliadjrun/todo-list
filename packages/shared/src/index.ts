/**
 * @notion/shared — tipe & skema Zod bersama web/api.
 * Sumber kebenaran kontrak API. Impor dari "@notion/shared".
 *
 * Re-export EKSPLISIT (bukan `export *`) agar named export terdeteksi oleh
 * bundler (Rollup/Vite) saat paket ini dikonsumsi sebagai CommonJS.
 */
export { ApiErrorSchema, ErrorCode, apiError } from "./http/error";
export type { ApiError } from "./http/error";

export { DependencyStatusSchema, HealthStatusSchema, HealthResponseSchema } from "./health/health";
export type { DependencyStatus, HealthStatus, HealthResponse } from "./health/health";

export {
  emailSchema,
  passwordSchema,
  RegisterInputSchema,
  LoginInputSchema,
  AuthUserSchema,
  AuthResponseSchema,
} from "./auth/auth";
export type { RegisterInput, LoginInput, AuthUser, AuthResponse } from "./auth/auth";

export {
  WorkspaceRoleSchema,
  WorkspaceTypeSchema,
  AssignableRoleSchema,
  CreateWorkspaceInputSchema,
  WorkspaceSummarySchema,
  WorkspaceMemberSchema,
  InviteMemberInputSchema,
  UpdateMemberRoleInputSchema,
  InvitationSchema,
  AcceptInvitationInputSchema,
} from "./workspace/workspace";
export type {
  WorkspaceRole,
  WorkspaceType,
  AssignableRole,
  CreateWorkspaceInput,
  WorkspaceSummary,
  WorkspaceMember,
  InviteMemberInput,
  UpdateMemberRoleInput,
  Invitation,
  AcceptInvitationInput,
} from "./workspace/workspace";

export {
  PageSchema,
  PageTreeNodeSchema,
  CreatePageInputSchema,
  UpdatePageInputSchema,
  MovePageInputSchema,
  PageContentSchema,
  PageDetailSchema,
  UpdatePageContentInputSchema,
} from "./page/page";
export type {
  Page,
  PageTreeNode,
  CreatePageInput,
  UpdatePageInput,
  MovePageInput,
  PageContent,
  PageDetail,
  UpdatePageContentInput,
} from "./page/page";

export {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_PREFIX,
  PresignUploadInputSchema,
  PresignUploadResponseSchema,
} from "./storage/upload";
export type { PresignUploadInput, PresignUploadResponse } from "./storage/upload";
