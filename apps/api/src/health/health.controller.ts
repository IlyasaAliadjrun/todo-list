import { Controller, Get, Header, HttpCode, HttpStatus } from "@nestjs/common";
import type { HealthResponse } from "@notion/shared";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * GET /health — cek koneksi DB & Redis. Selalu 200 dengan payload status;
   * konsumen memeriksa `status === "ok"`. (Readiness probe khusus di Fase 8.)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}
