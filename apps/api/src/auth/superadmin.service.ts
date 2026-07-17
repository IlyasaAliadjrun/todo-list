import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { loadEnv, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Menyinkronkan flag `User.isSuperAdmin` dari env `SUPERADMIN_EMAILS` saat boot.
 * Ini SATU-SATUNYA jalan menjadi superadmin — tidak ada endpoint promote/demote,
 * sehingga eskalasi hak lewat API/UI tidak mungkin (lihat ADR 0011).
 */
@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);
  private readonly env: Env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  /** Email superadmin dari env (lowercase, sudah dibersihkan). */
  get emails(): string[] {
    return this.env.SUPERADMIN_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  async onModuleInit(): Promise<void> {
    const emails = this.emails;
    // Cabut flag dari user yang tak lagi terdaftar di env.
    const revoked = await this.prisma.user.updateMany({
      where: { isSuperAdmin: true, email: { notIn: emails.length ? emails : ["__none__"] } },
      data: { isSuperAdmin: false },
    });
    if (emails.length === 0) {
      if (revoked.count > 0) this.logger.warn(`SUPERADMIN_EMAILS kosong — ${revoked.count} flag dicabut.`);
      return;
    }
    const granted = await this.prisma.user.updateMany({
      where: { email: { in: emails }, isSuperAdmin: false },
      data: { isSuperAdmin: true },
    });
    this.logger.log(
      `Superadmin tersinkron: ${emails.join(", ")} (+${granted.count} diberikan, -${revoked.count} dicabut)`,
    );
  }
}
