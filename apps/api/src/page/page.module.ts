import { Module } from "@nestjs/common";
import { PageController } from "./page.controller";
import { PageService } from "./page.service";
import { PurgeService } from "./purge.service";

@Module({
  controllers: [PageController],
  providers: [PageService, PurgeService],
})
export class PageModule {}
