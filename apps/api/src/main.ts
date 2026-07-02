import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { loadEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  // Validasi input pakai Zod (ZodValidationPipe per-endpoint), bukan class-validator.
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.API_PORT, "0.0.0.0");
  logger.log(`API berjalan di http://localhost:${env.API_PORT} (env: ${env.NODE_ENV})`);
}

void bootstrap();
