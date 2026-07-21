import { Module } from "@nestjs/common";
import {
  AdminController,
  EmployeeAdminController,
} from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  controllers: [AdminController, EmployeeAdminController],
  providers: [AdminService],
})
export class AdminModule {}
