import { Injectable } from "@nestjs/common";
import type { DependencyStatus, HealthResponse } from "@notion/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { aggregateStatus } from "./health.util";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [dbUp, redisUp] = await Promise.all([this.prisma.ping(), this.redis.ping()]);

    const services: { database: DependencyStatus; redis: DependencyStatus } = {
      database: dbUp ? "up" : "down",
      redis: redisUp ? "up" : "down",
    };

    return {
      status: aggregateStatus(services),
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
