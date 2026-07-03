import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginRateLimitService } from "./login-rate-limit.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/**
 * Global agar JwtAuthGuard, TokenService, & @CurrentUser bisa dipakai modul lain
 * (mis. workspace) tanpa re-import.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, LoginRateLimitService, JwtAuthGuard],
  exports: [TokenService, JwtAuthGuard, PasswordService],
})
export class AuthModule {}
