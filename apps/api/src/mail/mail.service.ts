import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { loadEnv, type Env } from "../config/env";

interface InviteParams {
  to: string;
  workspaceName: string;
  inviterName: string;
  token: string;
}

interface ResetParams {
  to: string;
  name: string;
  token: string;
}

/**
 * Pengiriman email via SMTP (nodemailer). Kompatibel Resend/Mailgun/SendGrid/SES/Gmail.
 * Bila MAIL_HOST kosong → dinonaktifkan (undangan tetap jalan lewat token).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly env: Env = loadEnv();
  private readonly transporter: Transporter | null;

  constructor() {
    if (this.env.MAIL_HOST) {
      this.transporter = nodemailer.createTransport({
        host: this.env.MAIL_HOST,
        port: this.env.MAIL_PORT,
        secure: this.env.MAIL_SECURE,
        auth: this.env.MAIL_USER
          ? { user: this.env.MAIL_USER, pass: this.env.MAIL_PASS }
          : undefined,
      });
      this.logger.log(`Email SMTP aktif (${this.env.MAIL_HOST}:${this.env.MAIL_PORT})`);
    } else {
      this.transporter = null;
      this.logger.warn("MAIL_HOST kosong — email dinonaktifkan; undangan memakai token.");
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  private appUrl(): string {
    return (this.env.APP_URL ?? this.env.WEB_ORIGIN).replace(/\/$/, "");
  }

  /** Kirim email reset password. Return true bila terkirim (best-effort). */
  async sendPasswordReset(params: ResetParams): Promise<boolean> {
    const resetUrl = `${this.appUrl()}/reset-password?token=${encodeURIComponent(params.token)}`;
    const subject = "Reset password — My Notepad";
    const text = [
      `Halo ${params.name},`,
      ``,
      `Kami menerima permintaan reset password untuk akun ini.`,
      `Buka tautan berikut untuk membuat password baru (berlaku 1 jam):`,
      resetUrl,
      ``,
      `Jika kamu tidak meminta ini, abaikan email ini — password lamamu tetap berlaku.`,
    ].join("\n");
    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 8px">My Notepad</h2>
      <p style="color:#475569;margin:0 0 16px">
        Halo <strong>${params.name}</strong>, ada permintaan reset password untuk akun ini.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
        Buat password baru
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">
        Tautan berlaku <strong>1 jam</strong> dan hanya bisa dipakai sekali.<br>
        Jika kamu tidak meminta ini, abaikan email ini — password lamamu tetap berlaku.
      </p>
    </div>`;
    return this.send({ to: params.to, subject, text, html }, "reset password");
  }

  /** Kirim email undangan workspace. Return true bila terkirim (best-effort). */
  async sendWorkspaceInvite(params: InviteParams): Promise<boolean> {
    if (!this.transporter) return false;

    const acceptUrl = `${this.appUrl()}/invite?token=${encodeURIComponent(params.token)}`;
    const subject = `Undangan ke workspace "${params.workspaceName}" — My Notepad`;
    const text = [
      `${params.inviterName} mengundang Anda bergabung ke workspace "${params.workspaceName}" di My Notepad.`,
      ``,
      `Terima undangan: ${acceptUrl}`,
      ``,
      `Jika tombol tidak bekerja, login lalu tempel token ini di "Terima undangan": ${params.token}`,
      `Undangan kedaluwarsa dalam 7 hari.`,
    ].join("\n");

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 8px">My Notepad</h2>
      <p style="color:#475569;margin:0 0 16px">
        <strong>${params.inviterName}</strong> mengundang Anda ke workspace
        <strong>${params.workspaceName}</strong>.
      </p>
      <a href="${acceptUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
        Terima undangan
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">
        Atau login lalu tempel token ini di "Terima undangan":<br>
        <code style="word-break:break-all">${params.token}</code><br>
        Kedaluwarsa dalam 7 hari.
      </p>
    </div>`;

    return this.send({ to: params.to, subject, text, html }, "undangan");
  }

  /**
   * Kirim satu email (best-effort) dengan retry untuk kegagalan transient
   * (blip DNS/jaringan sesaat, mis. queryA ETIMEOUT). Return false bila email
   * dinonaktifkan atau gagal permanen.
   */
  private async send(
    msg: { to: string; subject: string; text: string; html: string },
    label: string,
  ): Promise<boolean> {
    if (!this.transporter) return false;
    const message = { from: this.env.MAIL_FROM, ...msg };

    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.transporter.sendMail(message);
        this.logger.log(
          `Email ${label} terkirim ke ${msg.to}${attempt > 1 ? ` (percobaan ke-${attempt})` : ""}`,
        );
        return true;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        if (this.isTransient(err) && attempt < MAX_ATTEMPTS) {
          const delayMs = 300 * attempt; // 300ms, 600ms
          this.logger.warn(
            `Kirim email ${label} ke ${msg.to} gagal transien (${attempt}/${MAX_ATTEMPTS}): ${detail} — retry ${delayMs}ms`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        this.logger.error(`Gagal kirim email ${label} ke ${msg.to}: ${detail}`);
        return false;
      }
    }
    return false;
  }

  /** Error jaringan/DNS sesaat yang layak di-retry (bukan salah kredensial/alamat). */
  private isTransient(err: unknown): boolean {
    const code = (err as { code?: string })?.code ?? "";
    return [
      "ETIMEOUT",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "ECONNRESET",
      "ECONNREFUSED",
      "ESOCKET",
      "EDNS",
    ].includes(code);
  }
}
