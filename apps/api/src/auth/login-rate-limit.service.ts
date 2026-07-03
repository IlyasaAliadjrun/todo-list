import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ErrorCode } from "@notion/shared";
import { RedisService } from "../redis/redis.service";

/**
 * Rate limit percobaan login berbasis Redis: maksimal N gagal per identifier
 * (IP + email) dalam window tertentu. Counter di-reset saat login berhasil.
 */
@Injectable()
export class LoginRateLimitService {
  private readonly maxAttempts = 10;
  private readonly windowSeconds = 300; // 5 menit

  constructor(private readonly redis: RedisService) {}

  private key(identifier: string): string {
    return `rl:login:${identifier}`;
  }

  /** Naikkan counter; lempar 429 bila melewati batas. Panggil sebelum verifikasi. */
  async assertNotLimited(identifier: string): Promise<void> {
    const key = this.key(identifier);
    const attempts = await this.redis.client.incr(key);
    if (attempts === 1) {
      await this.redis.client.expire(key, this.windowSeconds);
    }
    if (attempts > this.maxAttempts) {
      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: "Terlalu banyak percobaan login. Coba lagi nanti.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async reset(identifier: string): Promise<void> {
    await this.redis.client.del(this.key(identifier));
  }
}
