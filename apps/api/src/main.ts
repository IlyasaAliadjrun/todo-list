import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import { AppModule } from "./app.module";
import { CollabService } from "./collab/collab.service";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { loadEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.use(cookieParser());
  // Validasi input pakai Zod (ZodValidationPipe per-endpoint), bukan class-validator.
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.API_PORT, "0.0.0.0");
  logger.log(`API berjalan di http://localhost:${env.API_PORT} (env: ${env.NODE_ENV})`);

  // Server Hocuspocus (Yjs) di path /collab pada HTTP server yang sama (lihat ADR 0007).
  const collab = app.get(CollabService);
  const httpServer = app.getHttpServer() as HttpServer;
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    if (!request.url?.startsWith("/collab")) return;
    wss.handleUpgrade(request, socket, head, (client) => {
      collab.hocuspocus.handleConnection(client, request);
    });
  });
  logger.log(`Hocuspocus (collab) siap di ws://localhost:${env.API_PORT}/collab`);
}

void bootstrap();
