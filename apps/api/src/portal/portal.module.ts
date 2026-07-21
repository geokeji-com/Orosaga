import { Module } from "@nestjs/common";
import { AssetsController } from "./assets.controller.js";
import { PortalController } from "./portal.controller.js";
import { PortalService } from "./portal.service.js";

@Module({
  controllers: [PortalController, AssetsController],
  providers: [PortalService],
})
export class PortalModule {}
