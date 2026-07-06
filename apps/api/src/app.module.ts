import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { CollabModule } from "./collab/collab.module";
import { DatabaseModule } from "./database/database.module";
import { FavoriteModule } from "./favorite/favorite.module";
import { HealthModule } from "./health/health.module";
import { PageModule } from "./page/page.module";
import { PermissionModule } from "./permission/permission.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { SearchModule } from "./search/search.module";
import { StorageModule } from "./storage/storage.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    PermissionModule,
    WorkspaceModule,
    PageModule,
    DatabaseModule,
    SearchModule,
    FavoriteModule,
    StorageModule,
    CollabModule,
    HealthModule,
  ],
})
export class AppModule {}
