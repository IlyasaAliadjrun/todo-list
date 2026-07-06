import { Server, type Hocuspocus } from "@hocuspocus/server";
import { Injectable, Logger } from "@nestjs/common";
import * as Y from "yjs";
import { TokenService } from "../auth/token.service";
import { PermissionService } from "../permission/permission.service";
import { PrismaService } from "../prisma/prisma.service";

/** Diteruskan ke context Hocuspocus setelah otorisasi berhasil. */
export interface CollabUser {
  id: string;
  email: string;
}

/**
 * Server Hocuspocus (Yjs) untuk kolaborasi real-time. Menempel ke server HTTP Nest
 * di path /collab (lihat main.ts). Persistensi: snapshot biner Yjs di Page.yjsState.
 * Otorisasi koneksi via permission per-halaman (lihat ADR 0007 & 0008).
 */
@Injectable()
export class CollabService {
  private readonly logger = new Logger(CollabService.name);
  readonly hocuspocus: Hocuspocus;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly permissions: PermissionService,
  ) {
    this.hocuspocus = Server.configure({
      onAuthenticate: async ({ token, documentName }) => {
        const { user, canEdit } = await this.authorize(token, documentName);
        return { user, canEdit };
      },
      // VIEW/COMMENT → koneksi read-only (tak bisa menulis dokumen; memuat konten
      // terkini saat membuka. Sinkronisasi live untuk viewer = backlog Fase 8).
      onConnect: async ({ connection, context }) => {
        if (!(context as { canEdit?: boolean }).canEdit) connection.readOnly = true;
      },
      onLoadDocument: async ({ documentName, document }) => {
        const page = await this.prisma.page.findUnique({
          where: { id: documentName },
          select: { yjsState: true },
        });
        if (page?.yjsState) Y.applyUpdate(document, new Uint8Array(page.yjsState));
        return document;
      },
      onStoreDocument: async ({ documentName, document }) => {
        const state = Buffer.from(Y.encodeStateAsUpdate(document));
        // Halaman bisa saja sudah dihapus; abaikan bila gagal.
        await this.prisma.page
          .update({ where: { id: documentName }, data: { yjsState: state } })
          .catch(() => undefined);
      },
    });
  }

  /**
   * Verifikasi access token + otorisasi dokumen (documentName = pageId) via level
   * permission efektif. Melempar Error (→ koneksi ditolak) bila di bawah VIEW.
   */
  async authorize(
    token: string | undefined,
    documentName: string,
  ): Promise<{ user: CollabUser; canEdit: boolean }> {
    if (!token) throw new Error("Token akses tidak ada");

    let sub: string;
    let email: string;
    try {
      const payload = this.tokens.verifyAccessToken(token);
      sub = payload.sub;
      email = payload.email;
    } catch {
      throw new Error("Token akses tidak valid");
    }

    const level = await this.permissions.getEffectiveLevel(documentName, sub);
    if (!level) throw new Error("Akses ditolak untuk dokumen ini");

    this.logger.debug(`Koneksi collab: ${email} → ${documentName} (${level})`);
    return { user: { id: sub, email }, canEdit: level === "EDIT" };
  }
}
