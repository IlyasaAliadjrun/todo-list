import { Controller, Get, Header, HttpCode, HttpStatus } from "@nestjs/common";
import type { HealthResponse } from "@notion/shared";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthService } from "./health.service";

@Controller("health")
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * GET /health — readiness: cek koneksi DB & Redis. Selalu 200 dengan payload status;
   * konsumen memeriksa `status === "ok"`.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  check(): Promise<HealthResponse> {
    return this.health.check();
  }

  /** GET /health/ready — alias readiness (untuk probe orkestrator). */
  @Get("ready")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  ready(): Promise<HealthResponse> {
    return this.health.check();
  }

  /** GET /health/live — liveness: proses hidup (tanpa cek dependency). */
  @Get("live")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  live(): { status: "ok" } {
    return { status: "ok" };
  }
}
