import { Module } from "@nestjs/common";
import {
  AdminContentController,
  ContentController,
} from "./content.controller.js";
import { ContentService } from "./content.service.js";

@Module({
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
})
export class ContentModule {}
