import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthUser, LoginInput, RegisterInput } from "@notion/shared";
import type { User } from "@notion/db";
import { uniqueSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "./auth.constants";
import { LoginRateLimitService } from "./login-rate-limit.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

/** Hasil auth internal: refreshToken mentah diteruskan ke controller untuk di-set cookie. */
export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly rateLimit: LoginRateLimitService,
  ) {}

  private toAuthUser(user: User): AuthUser {
    return { id: user.id, email: user.email, name: user.name };
  }

  private async issueFor(user: User, meta: RequestMeta): Promise<AuthResult> {
    const account: AuthenticatedUser = { id: user.id, email: user.email };
    const accessToken = this.tokens.signAccessToken(account);
    const refreshToken = await this.tokens.issueRefreshToken(user.id, meta);
    return { user: this.toAuthUser(user), accessToken, refreshToken };
  }

  /** Register + otomatis buat 1 workspace PERSONAL (OWNER) dalam satu transaksi. */
  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException("Email sudah terdaftar");

    const passwordHash = await this.password.hash(input.password);
    const displayName = input.name ?? input.email.split("@")[0];

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: input.email, passwordHash, name: input.name ?? null },
      });
      const workspace = await tx.workspace.create({
        data: { name: `Workspace ${displayName}`, slug: uniqueSlug(displayName), type: "PERSONAL" },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: created.id, role: "OWNER" },
      });
      return created;
    });

    return this.issueFor(user, meta);
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const identifier = `${meta.ip ?? "unknown"}:${input.email}`;
    await this.rateLimit.assertNotLimited(identifier);

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const ok = user && (await this.password.verify(user.passwordHash, input.password));
    if (!user || !ok) {
      throw new UnauthorizedException("Email atau password salah");
    }

    await this.rateLimit.reset(identifier);
    return this.issueFor(user, meta);
  }

  /** Rotasi refresh token; kembalikan access baru + refresh baru. */
  async refresh(rawToken: string | undefined, meta: RequestMeta): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException("Sesi tidak ditemukan");
    const rotated = await this.tokens.rotateRefreshToken(rawToken, meta);
    if (!rotated) throw new UnauthorizedException("Sesi tidak valid, silakan login lagi");

    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user) throw new UnauthorizedException("User tidak ditemukan");

    const accessToken = this.tokens.signAccessToken({ id: user.id, email: user.email });
    return { user: this.toAuthUser(user), accessToken, refreshToken: rotated.rawToken };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await this.tokens.revokeRefreshToken(rawToken);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User tidak ditemukan");
    return this.toAuthUser(user);
  }
}
