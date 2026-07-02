import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { loadEnv } from "../config/env";

/**
 * Klien Redis (ioredis) sebagai provider Nest. Dipakai untuk cache, rate limit,
 * dan session pada fase berikutnya. Fase 0: hanya untuk health check.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    const env = loadEnv();
    this.client = env.REDIS_URL
      ? new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 })
      : new Redis({
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });

    this.client.on("error", (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  /** Ping ringan untuk health check. */
  async ping(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  }
}
