import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "./auth.constants";
import { TokenService } from "./token.service";

/** Melindungi endpoint: butuh header `Authorization: Bearer <access token>`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token akses tidak ditemukan");
    }
    try {
      const payload = this.tokens.verifyAccessToken(header.slice(7));
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
    }
  }
}
