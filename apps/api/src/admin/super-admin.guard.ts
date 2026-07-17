import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../auth/auth.constants";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Izinkan hanya superadmin. Flag dibaca ULANG dari DB (bukan dari JWT) supaya
 * pencabutan lewat SUPERADMIN_EMAILS langsung berlaku tanpa menunggu token
 * kedaluwarsa. Dipakai SETELAH JwtAuthGuard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const id = req.user?.id;
    if (!id) throw new ForbiddenException("Butuh hak superadmin");

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { isSuperAdmin: true },
    });
    if (!user?.isSuperAdmin) throw new ForbiddenException("Butuh hak superadmin");
    return true;
  }
}
