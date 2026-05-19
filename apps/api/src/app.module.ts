// ============================================================
// Root Application Module — Modular Monolith Composition
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Infrastructure modules
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ProductsModule } from './modules/products/products.module';
import { OffersModule } from './modules/offers/offers.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BillsModule } from './modules/bills/bills.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { MediaModule } from './modules/media/media.module';
import { SearchModule } from './modules/search/search.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // ── Configuration ───────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting ───────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ── Infrastructure ──────────────────────────────────────
    DatabaseModule,
    RedisModule,

    // ── Domain Modules ──────────────────────────────────────
    AuthModule,
    UsersModule,
    BusinessesModule,
    ProductsModule,
    OffersModule,
    ReviewsModule,
    BillsModule,
    NotificationsModule,
    AnnouncementsModule,
    ReportsModule,
    AnalyticsModule,
    AuditModule,
    CategoriesModule,
    MediaModule,
    SearchModule,
    HealthModule,
  ],
})
export class AppModule {}
