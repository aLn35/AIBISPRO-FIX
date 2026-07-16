import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}