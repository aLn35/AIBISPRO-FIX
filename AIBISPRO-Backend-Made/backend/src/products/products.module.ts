import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CompaniesModule } from "../companies/companies.module";

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
