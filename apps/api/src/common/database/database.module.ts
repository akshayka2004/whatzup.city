import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import {
  UserRepository,
  BusinessRepository,
  OfferRepository,
  ReviewRepository,
  BillRepository,
  NotificationRepository,
  AnalyticsRepository,
  CategoryRepository,
  ProductRepository,
  BranchRepository,
  VerificationRepository,
  BillVerificationRepository,
  VerifiedPurchaseRepository,
  DeviceLoginRepository,
} from './repositories';

const REPOSITORIES = [
  UserRepository,
  BusinessRepository,
  OfferRepository,
  ReviewRepository,
  BillRepository,
  NotificationRepository,
  AnalyticsRepository,
  CategoryRepository,
  ProductRepository,
  BranchRepository,
  VerificationRepository,
  BillVerificationRepository,
  VerifiedPurchaseRepository,
  DeviceLoginRepository,
];

@Global()
@Module({
  providers: [DatabaseService, ...REPOSITORIES],
  exports: [DatabaseService, ...REPOSITORIES],
})
export class DatabaseModule {}
