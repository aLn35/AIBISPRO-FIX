import { Module } from "@nestjs/common";
import { RestockRequestsController } from "./restock-requests.controller";
import { RestockRequestsService } from "./restock-requests.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CompaniesModule } from "../companies/companies.module";

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [RestockRequestsController],
  providers: [RestockRequestsService],
})
export class RestockRequestsModule {}
