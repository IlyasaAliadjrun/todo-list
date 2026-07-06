import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PageModule } from "./page/page.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { StorageModule } from "./storage/storage.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    WorkspaceModule,
    PageModule,
    StorageModule,
    HealthModule,
  ],
})
export class AppModule {}
