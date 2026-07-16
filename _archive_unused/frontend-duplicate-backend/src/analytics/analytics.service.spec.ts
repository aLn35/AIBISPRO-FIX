import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    DashboardModule,
    ProductsModule,
    CategoriesModule,
    AnalyticsModule,
  ],
})