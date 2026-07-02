import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@notion/db";

/**
 * Membungkus PrismaClient sebagai provider Nest agar bisa di-inject.
 * Satu-satunya jalur ke database di dalam API.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Prisma terhubung ke database");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Ping ringan untuk health check. */
  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
