import {
  InvitationSchema,
  WorkspaceMemberSchema,
  WorkspaceSummarySchema,
  type AcceptInvitationInput,
  type CreateWorkspaceInput,
  type Invitation,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type WorkspaceMember,
  type WorkspaceSummary,
} from "@notion/shared";
import { z } from "zod";
import { apiFetch } from "@/lib/http";

const WorkspaceListSchema = z.array(WorkspaceSummarySchema);
const MemberListSchema = z.array(WorkspaceMemberSchema);

export function listWorkspaces(): Promise<WorkspaceSummary[]> {
  return apiFetch("/workspaces", {}, WorkspaceListSchema);
}

export function createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceSummary> {
  return apiFetch("/workspaces", { method: "POST", body: JSON.stringify(input) }, WorkspaceSummarySchema);
}

export function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return apiFetch(`/workspaces/${workspaceId}/members`, {}, MemberListSchema);
}

export function inviteMember(workspaceId: string, input: InviteMemberInput): Promise<Invitation> {
  return apiFetch(
    `/workspaces/${workspaceId}/invitations`,
    { method: "POST", body: JSON.stringify(input) },
    InvitationSchema,
  );
}

export function acceptInvitation(input: AcceptInvitationInput): Promise<WorkspaceSummary> {
  return apiFetch("/invitations/accept", { method: "POST", body: JSON.stringify(input) }, WorkspaceSummarySchema);
}

export function updateMemberRole(
  workspaceId: string,
  userId: string,
  input: UpdateMemberRoleInput,
): Promise<WorkspaceMember> {
  return apiFetch(
    `/workspaces/${workspaceId}/members/${userId}`,
    { method: "PATCH", body: JSON.stringify(input) },
    WorkspaceMemberSchema,
  );
}

export function removeMember(workspaceId: string, userId: string): Promise<void> {
  return apiFetch(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
}
