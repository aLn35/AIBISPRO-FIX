import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}