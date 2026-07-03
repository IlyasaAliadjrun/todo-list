import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import {
  LoginInputSchema,
  RegisterInputSchema,
  type AuthResponse,
  type AuthUser,
} from "@notion/shared";
import type { Request, Response } from "express";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { REFRESH_COOKIE, type AuthenticatedUser } from "./auth.constants";
import { AuthService, type AuthResult } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { TokenService } from "./token.service";

type RequestWithCookies = Request & { cookies?: Record<string, string> };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  private meta(req: Request): { userAgent?: string; ip?: string } {
    return { userAgent: req.headers["user-agent"], ip: req.ip };
  }

  /** Set cookie refresh + kembalikan payload publik (tanpa refresh token). */
  private respond(res: Response, result: AuthResult): AuthResponse {
    this.tokens.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(RegisterInputSchema)) dto: import("@notion/shared").RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.register(dto, this.meta(req)));
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginInputSchema)) dto: import("@notion/shared").LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.login(dto, this.meta(req)));
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const raw = req.cookies?.[REFRESH_COOKIE];
    return this.respond(res, await this.auth.refresh(raw, this.meta(req)));
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.tokens.clearRefreshCookie(res);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}
