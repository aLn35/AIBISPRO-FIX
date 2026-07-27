import { Module } from '@nestjs/common';
import { BundleProposalsController } from './bundle-proposals.controller';
import { BundleProposalsService } from './bundle-proposals.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [BundleProposalsController],
  providers: [BundleProposalsService],
})
export class BundleProposalsModule {}
