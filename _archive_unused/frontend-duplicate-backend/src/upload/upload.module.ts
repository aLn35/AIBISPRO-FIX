import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    PrismaModule,
    SalesModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}