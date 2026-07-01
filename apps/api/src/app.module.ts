// ============================================================
// Root Application Module — Modular Monolith Composition
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnv } from './common/config/env.validation';
import { SecurityExceptionFilter } from './common/filters/security-exception.filter';
import { StorageSerializerInterceptor } from './common/interceptors/storage-serializer.interceptor';

// Infrastructure modules
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ProductsModule } from './modules/products/products.module';
import { OffersModule } from './modules/offers/offers.module';
import { EventsModule } from './modules/events/events.module';
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
import { VerificationModule } from './modules/verification/verification.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { BillVerificationsModule } from './modules/bill-verifications/bill-verifications.module';
import { VerifiedPurchasesModule } from './modules/verified-purchases/verified-purchases.module';
import { TypesenseModule } from './modules/typesense/typesense.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { TrendingModule } from './modules/trending/trending.module';
import { SearchAnalyticsModule } from './modules/search-analytics/search-analytics.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { GovernmentAlertsModule } from './modules/government-alerts/government-alerts.module';
import { CivicModule } from './modules/civic/civic.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SegmentationModule } from './modules/segmentation/segmentation.module';
import { BusinessIntelligenceModule } from './modules/business-intelligence/bi.module';
import { LoggerModule } from './common/logger/logger.module';
import { CorrelationIdMiddleware } from './common/logger/correlation-id.middleware';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';

import { CustomersModule } from './modules/customers/customers.module';
import { CustomerOnboardingModule } from './modules/customer-onboarding/customer-onboarding.module';
import { BusinessOnboardingModule } from './modules/business-onboarding/business-onboarding.module';
import { BusinessDocumentsModule } from './modules/business-documents/business-documents.module';
import { BusinessMediaModule } from './modules/business-media/business-media.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OnboardingVerificationModule } from './modules/onboarding-verification/onboarding-verification.module';
import { OnboardingAnalyticsModule } from './modules/onboarding-analytics/onboarding-analytics.module';
import { EntityOnboardingModule } from './modules/entity-onboarding/entity-onboarding.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TeamModule } from './modules/team/team.module';
import { LaunchInterestsModule } from './modules/launch-interests/launch-interests.module';
import { TrialsModule } from './modules/trials/trials.module';

@Module({
  imports: [
    // ── Configuration ───────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      // Search local app dir first (apps/api/.env), then project root .env
      // (../../.env relative to apps/api/ where PM2 sets cwd).
      // PM2 ecosystem env vars override file values regardless.
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      validate: validateEnv,
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
    StorageModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        // Use REDIS_URL when available so BullMQ shares the same Redis
        // instance as RedisService — no duplicate connections.
        connection: config.get<string>('REDIS_URL')
          ? { url: config.get<string>('REDIS_URL') }
          : {
              host: config.get('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
              password: config.get('REDIS_PASSWORD'),
            },
        // Global default job options applied to every queue
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { count: 100 },  // keep last 100 completed
          removeOnFail:     { count: 200 },  // keep last 200 failed for inspection
        },
      }),
      inject: [ConfigService],
    }),

    // ── Domain Modules ──────────────────────────────────────
    AuthModule,
    UsersModule,
    BusinessesModule,
    ProductsModule,
    OffersModule,
    EventsModule,
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
    VerificationModule,
    DashboardModule,
    OcrModule,
    FraudModule,
    BillVerificationsModule,
    VerifiedPurchasesModule,
    TypesenseModule,
    DiscoveryModule,
    TrendingModule,
    SearchAnalyticsModule,
    RealtimeModule,
    CampaignsModule,
    GovernmentAlertsModule,
    CivicModule,
    PreferencesModule,
    MetricsModule,
    SegmentationModule,
    BusinessIntelligenceModule,
    LoggerModule,
    CustomersModule,
    CustomerOnboardingModule,
    BusinessOnboardingModule,
    BusinessDocumentsModule,
    BusinessMediaModule,
    SubscriptionsModule,
    PaymentsModule,
    OnboardingVerificationModule,
    OnboardingAnalyticsModule,
    EntityOnboardingModule,
    BranchesModule,
    TeamModule,
    LaunchInterestsModule,
    TrialsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: SecurityExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: StorageSerializerInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
