import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CollabModule } from "./collab/collab.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { PageModule } from "./page/page.module";
import { PermissionModule } from "./permission/permission.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { StorageModule } from "./storage/storage.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    PermissionModule,
    WorkspaceModule,
    PageModule,
    DatabaseModule,
    StorageModule,
    CollabModule,
    HealthModule,
  ],
})
export class AppModule {}
