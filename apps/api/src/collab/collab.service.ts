import { Server, type Hocuspocus } from "@hocuspocus/server";
import { Injectable, Logger } from "@nestjs/common";
import * as Y from "yjs";
import { TokenService } from "../auth/token.service";
import { PrismaService } from "../prisma/prisma.service";

/** Diteruskan ke context Hocuspocus setelah otorisasi berhasil. */
export interface CollabUser {
  id: string;
  email: string;
}

/**
 * Server Hocuspocus (Yjs) untuk kolaborasi real-time. Menempel ke server HTTP Nest
 * di path /collab (lihat main.ts). Persistensi: snapshot biner Yjs di Page.yjsState.
 * Lihat ADR 0007.
 */
@Injectable()
export class CollabService {
  private readonly logger = new Logger(CollabService.name);
  readonly hocuspocus: Hocuspocus;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {
    this.hocuspocus = Server.configure({
      onAuthenticate: async ({ token, documentName }) => {
        const user = await this.authorize(token, documentName);
        return { user };
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
   * Verifikasi access token + otorisasi dokumen (documentName = pageId) via
   * keanggotaan workspace. Melempar Error → koneksi WebSocket ditolak.
   */
  async authorize(token: string | undefined, documentName: string): Promise<CollabUser> {
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

    const page = await this.prisma.page.findUnique({
      where: { id: documentName },
      select: { workspaceId: true },
    });
    if (!page) throw new Error("Halaman tidak ditemukan");

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: page.workspaceId, userId: sub } },
    });
    if (!membership) throw new Error("Akses ditolak untuk dokumen ini");

    this.logger.debug(`Koneksi collab diizinkan: ${email} → ${documentName}`);
    return { id: sub, email };
  }
}
