import { Module } from "@nestjs/common";
import { CollabService } from "./collab.service";

@Module({
  providers: [CollabService],
  exports: [CollabService],
})
export class CollabModule {}
