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

    try {
      await this.transporter.sendMail({
        from: this.env.MAIL_FROM,
        to: params.to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email undangan terkirim ke ${params.to}`);
      return true;
    } catch (err) {
      this.logger.error(
        `Gagal kirim email undangan ke ${params.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
