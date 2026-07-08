import {
  DatabaseSchema,
  type CreateDatabaseInput,
  type CreatePropertyInput,
  type Database,
  type UpdateDatabaseViewInput,
  type UpdatePropertyInput,
} from "@notion/shared";
import { apiFetch } from "@/lib/http";

export function getDatabase(id: string): Promise<Database> {
  return apiFetch(`/databases/${id}`, {}, DatabaseSchema);
}

export function createDatabase(input: CreateDatabaseInput): Promise<Database> {
  return apiFetch("/databases", { method: "POST", body: JSON.stringify(input) }, DatabaseSchema);
}

export function updateDatabase(id: string, title: string): Promise<Database> {
  return apiFetch(
    `/databases/${id}`,
    { method: "PATCH", body: JSON.stringify({ title }) },
    DatabaseSchema,
  );
}

export function deleteDatabase(id: string): Promise<void> {
  return apiFetch(`/databases/${id}`, { method: "DELETE" });
}

export function updateDatabaseView(id: string, input: UpdateDatabaseViewInput): Promise<Database> {
  return apiFetch(
    `/databases/${id}/view`,
    { method: "PATCH", body: JSON.stringify(input) },
    DatabaseSchema,
  );
}

export function addProperty(databaseId: string, input: CreatePropertyInput): Promise<Database> {
  return apiFetch(
    `/databases/${databaseId}/properties`,
    { method: "POST", body: JSON.stringify(input) },
    DatabaseSchema,
  );
}

export function updateProperty(id: string, input: UpdatePropertyInput): Promise<Database> {
  return apiFetch(
    `/properties/${id}`,
    { method: "PATCH", body: JSON.stringify(input) },
    DatabaseSchema,
  );
}

export function moveProperty(id: string, afterId: string | null): Promise<Database> {
  return apiFetch(
    `/properties/${id}/move`,
    { method: "POST", body: JSON.stringify({ afterId }) },
    DatabaseSchema,
  );
}

export function deleteProperty(id: string): Promise<Database> {
  return apiFetch(`/properties/${id}`, { method: "DELETE" }, DatabaseSchema);
}

export function addRow(databaseId: string): Promise<Database> {
  return apiFetch(`/databases/${databaseId}/rows`, { method: "POST" }, DatabaseSchema);
}

export function deleteRow(id: string): Promise<Database> {
  return apiFetch(`/rows/${id}`, { method: "DELETE" }, DatabaseSchema);
}

export function setCell(rowId: string, propertyId: string, value: unknown): Promise<Database> {
  return apiFetch(
    `/rows/${rowId}/cells/${propertyId}`,
    { method: "PUT", body: JSON.stringify({ value }) },
    DatabaseSchema,
  );
}
