import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/** Token reset berlaku 1 jam. */
const TTL_MS = 60 * 60 * 1000;

/**
 * Alur "lupa password": token mentah hanya dikirim lewat email, DB simpan hash-nya
 * (pola sama dengan refresh token). Sekali pakai + kedaluwarsa. Lihat ADR 0011.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
  ) {}

  private hash(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Buat token & kirim email. SELALU "sukses" dari sisi pemanggil — respons tidak
   * boleh membocorkan apakah sebuah email terdaftar (user enumeration), dan token
   * mentah TIDAK PERNAH dikembalikan ke klien (kalau iya, siapa pun bisa mereset
   * akun orang lain). Bila email nonaktif, token hanya dicatat di log server.
   */
  async request(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.log(`Permintaan reset untuk email tak terdaftar: ${email} (diabaikan diam-diam)`);
      return;
    }

    // Token lama yang belum dipakai dibatalkan agar hanya satu yang aktif.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = randomBytes(32).toString("hex");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });

    const sent = await this.mail.sendPasswordReset({
      to: user.email,
      name: user.name ?? user.email,
      token: raw,
    });
    if (!sent) {
      // Email nonaktif/gagal: catat token di LOG SERVER saja (jangan pernah ke klien)
      // supaya operator masih bisa menolong user secara manual.
      this.logger.warn(
        `Email reset tak terkirim ke ${user.email}. Token (log server saja): ${raw}`,
      );
    }
  }

  /** Tukar token dengan password baru. Semua sesi user dicabut. */
  async reset(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Token reset tidak valid atau sudah kedaluwarsa");
    }

    const passwordHash = await this.password.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.tokens.revokeAllForUser(record.userId);
    this.logger.log(`Password direset via token untuk user ${record.userId}`);
  }
}
