import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingVerificationService } from './onboarding-verification.service';
import { DatabaseService } from '../../common/database/database.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OnboardingVerificationService', () => {
  let service: OnboardingVerificationService;
  let db: any;
  let searchService: any;
  let audit: any;
  let notifications: any;

  const mockDb = {
    tenant: {
      findUnique: jest.fn(),
    },
    verificationRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    entity: {
      update: jest.fn(),
    },
    business: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    uploadedDocument: {
      updateMany: jest.fn(),
    },
    onboardingProgress: {
      updateMany: jest.fn(),
    },
    onboardingEvent: {
      create: jest.fn(),
    },
    adminAction: {
      create: jest.fn(),
    },
  };

  const mockSearch = {
    indexBusiness: jest.fn(),
    removeFromIndex: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  const mockNotifications = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingVerificationService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: SearchService, useValue: mockSearch },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<OnboardingVerificationService>(OnboardingVerificationService);
    db = module.get<DatabaseService>(DatabaseService);
    searchService = module.get<SearchService>(SearchService);
    audit = module.get<AuditService>(AuditService);
    notifications = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPending', () => {
    it('should query pending businesses for a non-default tenant with tenant ID filter', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 'default-tenant-id', slug: 'default' });
      mockDb.verificationRequest.findMany.mockResolvedValue([]);
      mockDb.verificationRequest.count.mockResolvedValue(0);

      const result = await service.getPending('some-tenant-id', 1, 10);

      expect(mockDb.verificationRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'some-tenant-id',
            status: { in: ['PENDING', 'UNDER_REVIEW'] },
          }),
        }),
      );
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should bypass tenant filter if requested by default tenant admin', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 'default-tenant-id', slug: 'default' });
      mockDb.verificationRequest.findMany.mockResolvedValue([]);
      mockDb.verificationRequest.count.mockResolvedValue(0);

      await service.getPending('default-tenant-id', 1, 10);

      expect(mockDb.verificationRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            tenantId: 'default-tenant-id',
          }),
        }),
      );
    });
  });

  describe('approve', () => {
    it('should approve onboarding and update all related models', async () => {
      const mockRequest = {
        id: 'vr-123',
        tenantId: 'tenant-789',
        entityId: 'ent-123',
        status: 'PENDING',
        entity: {
          id: 'ent-123',
          type: 'BUSINESS',
          name: 'Test Coffee',
          userId: 'owner-456',
        },
      };
      const mockBusiness = {
        id: 'biz-123',
        ownerId: 'owner-456',
        name: 'Test Coffee',
        status: 'PENDING_VERIFICATION',
        tenantId: 'tenant-789',
      };

      mockDb.tenant.findUnique.mockResolvedValue({ id: 'default-id', slug: 'default' });
      mockDb.verificationRequest.findFirst.mockResolvedValue(mockRequest);
      mockDb.verificationRequest.update.mockResolvedValue({ ...mockRequest, status: 'APPROVED' });
      mockDb.business.findFirst.mockResolvedValue(mockBusiness);
      mockDb.business.update.mockResolvedValue({ ...mockBusiness, status: 'APPROVED' });

      const result = await service.approve('admin-uid', 'default-id', 'vr-123', {
        notes: 'Document details matched perfectly',
      });

      // Assert status transitions updated in db
      expect(mockDb.verificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'vr-123' },
        data: expect.objectContaining({
          status: 'APPROVED',
          verifiedBy: 'admin-uid',
          moderationNotes: 'Document details matched perfectly',
        }),
      });

      expect(mockDb.entity.update).toHaveBeenCalledWith({
        where: { id: 'ent-123' },
        data: { status: 'APPROVED' },
      });

      expect(mockDb.business.update).toHaveBeenCalledWith({
        where: { id: 'biz-123' },
        data: expect.objectContaining({
          status: 'APPROVED',
          isVerified: true,
        }),
      });

      expect(mockDb.onboardingProgress.updateMany).toHaveBeenCalledWith({
        where: { entityId: { in: ['ent-123', 'biz-123'] } },
        data: { status: 'APPROVED' },
      });

      expect(mockDb.uploadedDocument.updateMany).toHaveBeenCalledWith({
        where: { entityId: 'ent-123', status: 'PENDING' },
        data: { status: 'APPROVED' },
      });

      // Assert audit logs and notifications are triggered
      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-456',
          title: 'Verification Approved',
        }),
      );

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BUSINESS_ONBOARDING_APPROVED',
        }),
      );

      expect(result.status).toBe('APPROVED');
    });

    it('should throw NotFoundException if verification request not found', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 'default-id', slug: 'default' });
      mockDb.verificationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.approve('admin-uid', 'default-id', 'non-existent', { notes: 'N/A' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if verification request is already approved', async () => {
      const mockRequest = {
        id: 'vr-123',
        tenantId: 'tenant-789',
        entityId: 'ent-123',
        status: 'APPROVED',
        entity: {
          id: 'ent-123',
          type: 'BUSINESS',
          name: 'Test Coffee',
          userId: 'owner-456',
        },
      };
      mockDb.tenant.findUnique.mockResolvedValue({ id: 'default-id', slug: 'default' });
      mockDb.verificationRequest.findFirst.mockResolvedValue(mockRequest);

      await expect(
        service.approve('admin-uid', 'default-id', 'vr-123', { notes: 'N/A' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject onboarding and mark documents/verification requests as rejected', async () => {
      const mockRequest = {
        id: 'vr-123',
        tenantId: 'tenant-789',
        entityId: 'ent-123',
        status: 'PENDING',
        entity: {
          id: 'ent-123',
          type: 'BUSINESS',
          name: 'Test Coffee',
          userId: 'owner-456',
        },
      };
      const mockBusiness = {
        id: 'biz-123',
        ownerId: 'owner-456',
        name: 'Test Coffee',
        status: 'PENDING_VERIFICATION',
        tenantId: 'tenant-789',
      };

      mockDb.tenant.findUnique.mockResolvedValue({ id: 'default-id', slug: 'default' });
      mockDb.verificationRequest.findFirst.mockResolvedValue(mockRequest);
      mockDb.verificationRequest.update.mockResolvedValue({ ...mockRequest, status: 'REJECTED' });
      mockDb.business.findFirst.mockResolvedValue(mockBusiness);
      mockDb.business.update.mockResolvedValue({ ...mockBusiness, status: 'REJECTED' });

      const result = await service.reject('admin-uid', 'default-id', 'vr-123', {
        reason: 'Expired documents uploaded',
      });

      expect(mockDb.verificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'vr-123' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Expired documents uploaded',
        }),
      });

      expect(mockDb.entity.update).toHaveBeenCalledWith({
        where: { id: 'ent-123' },
        data: { status: 'REJECTED' },
      });

      expect(mockDb.business.update).toHaveBeenCalledWith({
        where: { id: 'biz-123' },
        data: { status: 'REJECTED' },
      });

      expect(mockDb.uploadedDocument.updateMany).toHaveBeenCalledWith({
        where: { entityId: 'ent-123', status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Expired documents uploaded',
        },
      });

      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-456',
          title: 'Verification Rejected',
          body: 'Your verification request needs changes: Expired documents uploaded',
        }),
      );

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BUSINESS_ONBOARDING_REJECTED',
        }),
      );

      expect(result.status).toBe('REJECTED');
    });
  });
});
