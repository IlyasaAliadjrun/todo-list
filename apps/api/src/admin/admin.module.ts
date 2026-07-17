import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { SuperAdminGuard } from "./super-admin.guard";

/** Panel superadmin. AuthModule global menyediakan JwtAuthGuard/PasswordService/TokenService. */
@Module({
  controllers: [AdminController],
  providers: [AdminService, SuperAdminGuard],
})
export class AdminModule {}
