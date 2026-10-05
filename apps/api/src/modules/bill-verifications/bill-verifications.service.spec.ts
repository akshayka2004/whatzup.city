import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BillVerificationsService } from './bill-verifications.service';

function makeService() {
  const tx: any = {
    bill: { update: jest.fn() },
    billVerification: { update: jest.fn(async ({ data }) => ({ id: 'ver-1', ...data })) },
  };
  const verificationRepo: any = { findByIdUnsafe: jest.fn(), update: jest.fn(async (_t, _id, data) => ({ id: 'ver-1', ...data })) };
  const billRepo: any = { verifyBill: jest.fn(), update: jest.fn() };
  const fraud: any = {};
  const audit: any = { log: jest.fn() };
  const verifiedPurchases: any = { createVerifiedPurchase: jest.fn() };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const analytics: any = { refreshUserSpending: jest.fn(async () => {}), refreshBusinessSummary: jest.fn(async () => {}) };
  const db: any = {
    business: { findUnique: jest.fn() },
    businessStaff: { findFirst: jest.fn() },
    pointsEntry: { create: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const brandScope: any = { isBrandOwnerOf: jest.fn(async () => false) };
  const brands: any = { recordEvent: jest.fn() };
  const service = new BillVerificationsService(
    verificationRepo, billRepo, fraud, audit, verifiedPurchases, notifications, analytics, db, brandScope, brands,
  );
  return { service, verificationRepo, billRepo, verifiedPurchases, db, tx, brandScope, brands };
}

const verification = (over: any = {}) => ({
  id: 'ver-1',
  tenantId: 't-cust',
  billId: 'bill-1',
  businessId: 'biz-1',
  status: 'PENDING',
  bill: { id: 'bill-1', userId: 'cust-1', businessId: 'biz-1', amount: 500, billDate: new Date() },
  ...over,
});

describe('BillVerificationsService', () => {
  describe('approve', () => {
    it('marks the bill VERIFIED (Bill.status has no APPROVED) and creates the verified purchase', async () => {
      const h = makeService();
      h.verificationRepo.findByIdUnsafe.mockResolvedValue(verification());
      await h.service.approve('t', 'ver-1', 'mod-1', 'BUSINESS_MODERATOR', 'biz-1');

      expect(h.verificationRepo.update.mock.calls[0][2]).toMatchObject({ status: 'APPROVED', moderatorId: 'mod-1' });
      expect(h.billRepo.verifyBill).toHaveBeenCalledWith('t-cust', 'bill-1', 'VERIFIED', 'mod-1');
      expect(h.verifiedPurchases.createVerifiedPurchase).toHaveBeenCalledWith('t-cust', 'cust-1', 'biz-1', 'bill-1', 500, expect.any(Date));
    });

    it('refuses to approve a bill that is already decided', async () => {
      const h = makeService();
      h.verificationRepo.findByIdUnsafe.mockResolvedValue(verification({ status: 'REJECTED' }));
      await expect(h.service.approve('t', 'ver-1', 'mod-1', 'BUSINESS_MODERATOR', 'biz-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('requestReUpload', () => {
    it('puts the bill back to UPLOADED, never the invalid RE_UPLOAD_REQUESTED', async () => {
      const h = makeService();
      h.verificationRepo.findByIdUnsafe.mockResolvedValue(verification());
      await h.service.requestReUpload('t', 'ver-1', 'mod-1', 'biz-1', 'blurry');
      expect(h.billRepo.update).toHaveBeenCalledWith('t-cust', 'bill-1', { status: 'UPLOADED' });
    });
  });

  describe('assertCanModerate', () => {
    it('lets platform admins through without a lookup', async () => {
      const h = makeService();
      await expect(h.service.assertCanModerate('a', 'SUPER_ADMIN', 'biz-1')).resolves.toBeUndefined();
      expect(h.db.business.findUnique).not.toHaveBeenCalled();
    });

    it('lets the business owner, a brand owner and active staff through', async () => {
      const h = makeService();
      h.db.business.findUnique.mockResolvedValue({ ownerId: 'owner-1' });
      await expect(h.service.assertCanModerate('owner-1', 'BUSINESS_OWNER', 'biz-1')).resolves.toBeUndefined();

      h.brandScope.isBrandOwnerOf.mockResolvedValueOnce(true);
      await expect(h.service.assertCanModerate('brand-owner', 'BUSINESS_OWNER', 'biz-1')).resolves.toBeUndefined();

      h.db.businessStaff.findFirst.mockResolvedValueOnce({ id: 's' });
      await expect(h.service.assertCanModerate('staff', 'BUSINESS_MODERATOR', 'biz-1')).resolves.toBeUndefined();
    });

    it('blocks a moderator of a different business', async () => {
      const h = makeService();
      h.db.business.findUnique.mockResolvedValue({ ownerId: 'owner-1' });
      h.db.businessStaff.findFirst.mockResolvedValue(null);
      await expect(h.service.assertCanModerate('stranger', 'BUSINESS_MODERATOR', 'biz-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('reassignOutlet', () => {
    const from = { id: 'biz-1', name: 'X - A', brandId: 'brand-1', tenantId: 'ten', brand: { ownerId: 'owner-1', name: 'X' } };
    const to = { id: 'biz-2', name: 'X - B', brandId: 'brand-1', status: 'APPROVED', deletedAt: null };

    function arm(h: ReturnType<typeof makeService>, ver = verification(), toBiz: any = to) {
      h.verificationRepo.findByIdUnsafe.mockResolvedValue(ver);
      h.db.business.findUnique.mockImplementation(async ({ where }: any) => (where.id === 'biz-1' ? from : toBiz));
    }

    it('moves an undecided bill and its verification, and logs a brand event', async () => {
      const h = makeService();
      arm(h);
      await h.service.reassignOutlet('owner-1', 'BUSINESS_OWNER', 'ver-1', 'biz-2');
      expect(h.tx.bill.update).toHaveBeenCalledWith({ where: { id: 'bill-1' }, data: { businessId: 'biz-2' } });
      expect(h.tx.billVerification.update).toHaveBeenCalledWith({ where: { id: 'ver-1' }, data: { businessId: 'biz-2' } });
      expect(h.brands.recordEvent.mock.calls[0][0]).toMatchObject({ type: 'BILL_REASSIGNED', brandId: 'brand-1' });
    });

    it('only the brand owner may move a bill', async () => {
      const h = makeService();
      arm(h);
      await expect(h.service.reassignOutlet('someone-else', 'BUSINESS_OWNER', 'ver-1', 'biz-2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to move a bill to an outlet of another brand', async () => {
      const h = makeService();
      arm(h, verification(), { ...to, brandId: 'brand-2' });
      await expect(h.service.reassignOutlet('owner-1', 'BUSINESS_OWNER', 'ver-1', 'biz-2')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to move a bill that was already decided (the purchase would be orphaned)', async () => {
      const h = makeService();
      arm(h, verification({ status: 'APPROVED' }));
      await expect(h.service.reassignOutlet('owner-1', 'BUSINESS_OWNER', 'ver-1', 'biz-2')).rejects.toBeInstanceOf(BadRequestException);
      expect(h.tx.bill.update).not.toHaveBeenCalled();
    });
  });
});
