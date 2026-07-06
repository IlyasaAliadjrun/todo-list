import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { CollabModule } from "./collab/collab.module";
import { loadEnv } from "./config/env";
import { DatabaseModule } from "./database/database.module";
import { FavoriteModule } from "./favorite/favorite.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { PageModule } from "./page/page.module";
import { PermissionModule } from "./permission/permission.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { SearchModule } from "./search/search.module";
import { StorageModule } from "./storage/storage.module";
import { WorkspaceModule } from "./workspace/workspace.module";

const env = loadEnv();

@Module({
  imports: [
    // Structured logging (pino) + request id (lihat ADR 0010 / observability).
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const existing = req.headers["x-request-id"];
          const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        autoLogging: { ignore: (req) => req.url === "/health/live" },
        redact: ["req.headers.authorization", "req.headers.cookie", "req.headers['set-cookie']"],
        transport:
          env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
      },
    }),
    // Rate limit global kasar (anti-abuse); login punya rate-limit Redis lebih ketat.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MIN }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    MailModule,
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
