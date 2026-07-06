import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

const TRASH_TTL_DAYS = 30;

/** Auto-purge trash: hapus permanen halaman terarsip lebih dari N hari. */
@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledPurge(): Promise<void> {
    const count = await this.purgeExpired(TRASH_TTL_DAYS);
    if (count > 0) this.logger.log(`Auto-purge trash: ${count} halaman dihapus permanen`);
  }

  /** Hapus halaman terarsip yang archivedAt lebih tua dari `days`. Return jumlah. */
  async purgeExpired(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const res = await this.prisma.page.deleteMany({
      where: { isArchived: true, archivedAt: { lt: cutoff } },
    });
    return res.count;
  }
}
