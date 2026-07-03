import { JwtService } from "@nestjs/jwt";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { TokenService } from "./token.service";

// Env minimal agar loadEnv() lolos saat TokenService dikonstruksi.
process.env.JWT_ACCESS_SECRET ??= "test_secret_minimal_16_chars_ok";
process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db?schema=public";

interface FakeSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** PrismaService palsu berbasis Map — cukup untuk menguji logika rotasi. */
function makeFakePrisma(store: Map<string, FakeSession>) {
  let seq = 0;
  return {
    session: {
      findUnique: async ({ where: { tokenHash } }: { where: { tokenHash: string } }) =>
        store.get(tokenHash) ?? null,
      create: async ({ data }: { data: Omit<FakeSession, "id" | "revokedAt" | "replacedById"> }) => {
        seq += 1;
        const session: FakeSession = { id: `gen-${seq}`, revokedAt: null, replacedById: null, ...data };
        store.set(session.tokenHash, session);
        return session;
      },
      update: async ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeSession> }) => {
        for (const s of store.values()) if (s.id === id) Object.assign(s, data);
        return {};
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { userId: string; revokedAt: null };
        data: Partial<FakeSession>;
      }) => {
        let count = 0;
        for (const s of store.values()) {
          if (s.userId === where.userId && s.revokedAt === null) {
            Object.assign(s, data);
            count += 1;
          }
        }
        return { count };
      },
    },
  } as unknown as PrismaService;
}

describe("TokenService.rotateRefreshToken", () => {
  let store: Map<string, FakeSession>;
  let tokens: TokenService;

  function setup() {
    store = new Map<string, FakeSession>();
    tokens = new TokenService(new JwtService({}), makeFakePrisma(store));
  }

  it("merotasi token valid: revoke lama, terbitkan baru", async () => {
    setup();
    const raw = "raw-valid-token";
    store.set(sha256(raw), {
      id: "s1",
      userId: "user-1",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedById: null,
    });

    const result = await tokens.rotateRefreshToken(raw);
    expect(result?.userId).toBe("user-1");
    expect(result?.rawToken).toBeTruthy();
    expect(result?.rawToken).not.toBe(raw);

    const old = store.get(sha256(raw));
    expect(old?.revokedAt).toBeInstanceOf(Date);
    expect(old?.replacedById).toBeTruthy();
    // token baru tersimpan & aktif
    expect(store.get(sha256(result!.rawToken))?.revokedAt).toBeNull();
  });

  it("menolak token kedaluwarsa", async () => {
    setup();
    const raw = "raw-expired";
    store.set(sha256(raw), {
      id: "s1",
      userId: "user-1",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      replacedById: null,
    });
    expect(await tokens.rotateRefreshToken(raw)).toBeNull();
  });

  it("mendeteksi reuse: token yang sudah di-revoke → revoke semua sesi user", async () => {
    setup();
    const raw = "raw-revoked";
    store.set(sha256(raw), {
      id: "s1",
      userId: "user-1",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      replacedById: null,
    });
    // sesi aktif lain milik user yang sama
    store.set("other", {
      id: "s2",
      userId: "user-1",
      tokenHash: "other",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedById: null,
    });

    expect(await tokens.rotateRefreshToken(raw)).toBeNull();
    expect(store.get("other")?.revokedAt).toBeInstanceOf(Date); // ikut di-revoke
  });
});
