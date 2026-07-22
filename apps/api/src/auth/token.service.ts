import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Response } from "express";
import { loadEnv, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { REFRESH_COOKIE, type AccessTokenPayload, type AuthenticatedUser } from "./auth.constants";

interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

/**
 * Menerbitkan access token (JWT) & mengelola refresh token opaque (ter-hash di
 * DB) dengan rotasi + deteksi reuse. Lihat ADR 0003.
 */
@Injectable()
export class TokenService {
  private readonly env: Env = loadEnv();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(user: AuthenticatedUser): string {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.JWT_ACCESS_TTL,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, { secret: this.env.JWT_ACCESS_SECRET });
  }

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.env.JWT_REFRESH_TTL * 1000);
  }

  /** Buat sesi refresh baru, kembalikan token mentah untuk di-set sebagai cookie. */
  async issueRefreshToken(userId: string, meta: SessionMeta = {}): Promise<string> {
    const raw = randomBytes(32).toString("hex");
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(raw),
        expiresAt: this.refreshExpiry(),
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    });
    return raw;
  }

  /**
   * Rotasi: validasi refresh token, revoke yang lama, terbitkan yang baru.
   * Mengembalikan null bila token tidak valid/expired. Bila token yang SUDAH
   * di-revoke dipakai ulang (indikasi pencurian), semua sesi user di-revoke.
   */
  async rotateRefreshToken(
    raw: string,
    meta: SessionMeta = {},
  ): Promise<{ userId: string; rawToken: string } | null> {
    const tokenHash = this.hashToken(raw);
    const session = await this.prisma.session.findUnique({ where: { tokenHash } });

    if (!session || session.expiresAt < new Date()) return null;

    if (session.revokedAt) {
      // Reuse detection: matikan seluruh sesi aktif user ini.
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }

    const rawToken = randomBytes(32).toString("hex");
    const created = await this.prisma.session.create({
      data: {
        userId: session.userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: this.refreshExpiry(),
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), replacedById: created.id },
    });

    return { userId: session.userId, rawToken };
  }

  /** Revoke satu refresh token (logout). Aman dipanggil walau token tak ada. */
  async revokeRefreshToken(raw: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke SEMUA sesi aktif milik user (dipakai saat password berubah/di-reset). */
  async revokeAllForUser(userId: string): Promise<number> {
    const res = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.count;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      // COOKIE_SECURE menang bila diset; jika tidak, ikut NODE_ENV (production = Secure).
      secure: this.env.COOKIE_SECURE ?? this.env.NODE_ENV === "production",
      path: "/",
      maxAge: this.env.JWT_REFRESH_TTL * 1000,
    };
  }

  setRefreshCookie(res: Response, raw: string): void {
    res.cookie(REFRESH_COOKIE, raw, this.cookieOptions());
  }

  clearRefreshCookie(res: Response): void {
    const { maxAge: _maxAge, ...opts } = this.cookieOptions();
    res.clearCookie(REFRESH_COOKIE, opts);
  }
}
