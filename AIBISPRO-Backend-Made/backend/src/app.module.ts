import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { AuthModule } from './auth/auth.module';
import { PromotionsModule } from './promotions/promotions.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { AIModule } from './services/ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { CompaniesModule } from './companies/companies.module';
import { InboxModule } from './inbox/inbox.module';
import { RestockRequestsModule } from './restock-requests/restock-requests.module';
import { BundleProposalsModule } from './bundle-proposals/bundle-proposals.module';

@Module({
  imports: [PrismaModule, DashboardModule, ProductsModule, CategoriesModule, AnalyticsModule, SalesModule, InventoryModule, AuthModule, PromotionsModule, UsersModule, UploadModule, AIModule, ChatModule, CompaniesModule, InboxModule, RestockRequestsModule, BundleProposalsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
