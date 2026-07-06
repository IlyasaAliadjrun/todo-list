import { Global, Module } from "@nestjs/common";
import { PermissionController } from "./permission.controller";
import { PermissionService } from "./permission.service";

/** Global agar PageModule, DatabaseModule, & CollabModule bisa memakai resolver. */
@Global()
@Module({
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
