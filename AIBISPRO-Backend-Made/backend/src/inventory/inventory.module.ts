import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}