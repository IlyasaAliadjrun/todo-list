import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "./auth.constants";

/** Ambil user terautentikasi dari request (diset oleh JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const req = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return req.user;
  },
);
