import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { AdminUser } from "@notion/shared";
import { PasswordService } from "../auth/password.service";
import { SuperAdminService } from "../auth/superadmin.service";
import { TokenService } from "../auth/token.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Operasi superadmin. Catatan penting: TIDAK ADA endpoint untuk mengangkat/
 * mencabut superadmin — status itu hanya berasal dari env SUPERADMIN_EMAILS
 * (lihat SuperAdminService), sehingga eskalasi hak lewat API tidak mungkin.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly superAdmin: SuperAdminService,
  ) {}

  /** Daftar semua user + ringkasan (workspace & sesi aktif). */
  async listUsers(): Promise<AdminUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { memberships: true } },
        sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt.toISOString(),
      workspaceCount: u._count.memberships,
      activeSessions: u.sessions.length,
    }));
  }

  /** Tetapkan password baru untuk user (tanpa password lama) + cabut semua sesinya. */
  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User tidak ditemukan");

    const passwordHash = await this.password.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    const revoked = await this.tokens.revokeAllForUser(userId);
    this.logger.warn(
      `Superadmin menetapkan password baru untuk ${user.email}; ${revoked} sesi dicabut.`,
    );
  }

  /** Paksa logout: cabut semua sesi aktif user. */
  async revokeSessions(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User tidak ditemukan");
    const n = await this.tokens.revokeAllForUser(userId);
    this.logger.warn(`Superadmin mencabut ${n} sesi milik ${user.email}.`);
    return n;
  }

  /** Hapus user beserta datanya (cascade). Superadmin tak bisa dihapus. */
  async deleteUser(userId: string, actorId: string): Promise<void> {
    if (userId === actorId) throw new BadRequestException("Tidak bisa menghapus akun sendiri");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User tidak ditemukan");
    if (user.isSuperAdmin || this.superAdmin.emails.includes(user.email)) {
      throw new BadRequestException("Superadmin tidak bisa dihapus (atur lewat SUPERADMIN_EMAILS)");
    }
    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.warn(`Superadmin menghapus user ${user.email}.`);
  }
}
