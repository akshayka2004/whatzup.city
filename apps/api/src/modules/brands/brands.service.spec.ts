import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BrandsService } from './brands.service';

const OWNER = 'user-1';
const TENANT = 'tenant-1';

function makeService() {
  const tx: any = {
    brand: { create: jest.fn(async ({ data }) => ({ id: 'brand-1', ...data })), update: jest.fn() },
    business: { update: jest.fn(), create: jest.fn(async ({ data }) => ({ id: 'biz-new', ...data })), updateMany: jest.fn() },
    user: { update: jest.fn(), updateMany: jest.fn() },
    entity: { create: jest.fn(async () => ({ id: 'ent-new' })) },
    verificationRequest: { create: jest.fn() },
    businessStaff: { create: jest.fn() },
    onboardingProgress: { create: jest.fn(async () => ({ id: 'op-1' })) },
    onboardingEvent: { create: jest.fn() },
  };
  const db: any = {
    brand: { findFirst: jest.fn(), create: jest.fn() },
    business: { findFirst: jest.fn(), findMany: jest.fn(async () => []) },
    category: { findFirst: jest.fn() },
    brandEvent: { create: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const redis: any = { del: jest.fn() };
  const crypto: any = { decrypt: jest.fn((v) => v) };
  const audit: any = { log: jest.fn() };
  const search: any = { indexBusiness: jest.fn(), removeFromIndex: jest.fn() };
  const service = new BrandsService(db, redis, crypto, audit, search);
  return { service, db, tx, redis, audit };
}

const outletDto = { outletLabel: 'Kozhikode', phone: '9999999999', email: 'a@b.co' };

describe('BrandsService', () => {
  describe('convert', () => {
    const dto = { businessId: 'biz-1', brandName: 'Spice Co', billSeriesMode: 'SHARED' as const, billSeriesPrefix: ' SC/2026/ ' };
    const business = { id: 'biz-1', tenantId: TENANT, name: 'Spice Co - Main', status: 'APPROVED', brandId: null };

    it('rejects a business the caller does not own', async () => {
      const { service, db } = makeService();
      db.business.findFirst.mockResolvedValue(null);
      await expect(service.convert(OWNER, dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a business that is already branded', async () => {
      const { service, db } = makeService();
      db.business.findFirst.mockResolvedValue({ ...business, brandId: 'brand-9' });
      await expect(service.convert(OWNER, dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a second brand for the same owner', async () => {
      const { service, db } = makeService();
      db.business.findFirst.mockResolvedValue(business);
      db.brand.findFirst.mockResolvedValue({ name: 'Existing' });
      await expect(service.convert(OWNER, dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a taken brand name', async () => {
      const { service, db } = makeService();
      db.business.findFirst.mockResolvedValue(business);
      db.brand.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'other' });
      await expect(service.convert(OWNER, dto)).rejects.toThrow('already registered');
    });

    it('links the business as head outlet, pins it as active and records an event', async () => {
      const { service, db, tx, audit } = makeService();
      db.business.findFirst.mockResolvedValue(business);
      db.brand.findFirst.mockResolvedValue(null);
      await service.convert(OWNER, dto);

      expect(tx.brand.create.mock.calls[0][0].data).toMatchObject({
        tenantId: TENANT,
        ownerId: OWNER,
        name: 'Spice Co',
        billSeriesMode: 'SHARED',
        billSeriesPrefix: 'SC/2026/',
      });
      expect(tx.business.update.mock.calls[0][0].data).toMatchObject({ brandId: 'brand-1', isBrandHq: true, brandName: 'Spice Co' });
      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: OWNER }, data: { activeBusinessId: 'biz-1' } });
      expect(db.brandEvent.create.mock.calls[0][0].data.type).toBe('BRAND_CONVERTED');
      expect(audit.log).toHaveBeenCalled();
    });

    it('drops the prefix when the series is per outlet', async () => {
      const { service, db, tx } = makeService();
      db.business.findFirst.mockResolvedValue(business);
      db.brand.findFirst.mockResolvedValue(null);
      await service.convert(OWNER, { ...dto, billSeriesMode: 'PER_OUTLET' });
      expect(tx.brand.create.mock.calls[0][0].data.billSeriesPrefix).toBeNull();
    });
  });

  describe('addOutlet', () => {
    const brand = { id: 'brand-1', tenantId: TENANT, ownerId: OWNER, name: 'Spice Co', status: 'ACTIVE' };
    const hq = { categoryId: 'cat-1', category: { slug: 'restaurants' } };

    function arm(h: ReturnType<typeof makeService>, over: { brand?: any } = {}) {
      h.db.brand.findFirst.mockResolvedValue(over.brand ?? brand);
      // calls: hq lookup, duplicate-name check, duplicate-contact check
      h.db.business.findFirst.mockResolvedValueOnce(hq).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    }

    it('refuses a suspended brand', async () => {
      const h = makeService();
      arm(h, { brand: { ...brand, status: 'SUSPENDED' } });
      await expect(h.service.addOutlet(OWNER, 'brand-1', outletDto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a duplicate outlet name', async () => {
      const h = makeService();
      h.db.brand.findFirst.mockResolvedValue(brand);
      h.db.business.findFirst.mockResolvedValueOnce(hq).mockResolvedValueOnce({ id: 'dup' });
      await expect(h.service.addOutlet(OWNER, 'brand-1', outletDto)).rejects.toThrow('already exists');
    });

    it('refuses a phone or email already used by another outlet', async () => {
      const h = makeService();
      h.db.brand.findFirst.mockResolvedValue(brand);
      h.db.business.findFirst.mockResolvedValueOnce(hq).mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'a@b.co' });
      await expect(h.service.addOutlet(OWNER, 'brand-1', outletDto)).rejects.toThrow('email is already used');
    });

    it('creates a pending outlet in the brand tenant under the brand and records an event', async () => {
      const h = makeService();
      arm(h);
      const res = await h.service.addOutlet(OWNER, 'brand-1', outletDto);

      const created = h.tx.business.create.mock.calls[0][0].data;
      expect(created).toMatchObject({
        tenantId: TENANT,
        ownerId: OWNER,
        categoryId: 'cat-1',
        name: 'Spice Co - Kozhikode',
        status: 'PENDING_VERIFICATION',
        isVerified: false,
        brandId: 'brand-1',
        isBrandHq: false,
        outletLabel: 'Kozhikode',
      });
      expect(h.tx.verificationRequest.create).toHaveBeenCalled();
      expect(h.tx.businessStaff.create).toHaveBeenCalled();
      expect(h.db.brandEvent.create.mock.calls[0][0].data.type).toBe('OUTLET_ADDED');
      expect(res.business.id).toBe('biz-new');
    });
  });

  describe('removeOutlet', () => {
    it('never removes the head outlet', async () => {
      const h = makeService();
      h.db.brand.findFirst.mockResolvedValue({ id: 'brand-1', tenantId: TENANT, ownerId: OWNER, name: 'X' });
      h.db.business.findFirst.mockResolvedValue({ id: 'biz-1', name: 'X', isBrandHq: true });
      await expect(h.service.removeOutlet(OWNER, 'brand-1', 'biz-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('archives a branch outlet and clears the active pin if it pointed there', async () => {
      const h = makeService();
      h.db.brand.findFirst.mockResolvedValue({ id: 'brand-1', tenantId: TENANT, ownerId: OWNER, name: 'X' });
      h.db.business.findFirst.mockResolvedValue({ id: 'biz-2', name: 'X - B', isBrandHq: false });
      await h.service.removeOutlet(OWNER, 'brand-1', 'biz-2');
      expect(h.tx.business.update.mock.calls[0][0].data).toMatchObject({ status: 'ARCHIVED' });
      expect(h.tx.user.updateMany).toHaveBeenCalledWith({ where: { id: OWNER, activeBusinessId: 'biz-2' }, data: { activeBusinessId: null } });
      expect(h.db.brandEvent.create.mock.calls[0][0].data.type).toBe('OUTLET_REMOVED');
    });
  });

  describe('update (bill series)', () => {
    const brand = { id: 'brand-1', tenantId: TENANT, ownerId: OWNER, name: 'X', billSeriesMode: 'SHARED', billSeriesPrefix: 'SC/2026/' };

    it('requires a prefix when the series is shared', async () => {
      const h = makeService();
      h.db.brand.findFirst.mockResolvedValue({ ...brand, billSeriesMode: 'PER_OUTLET', billSeriesPrefix: null });
      await expect(h.service.update(OWNER, 'brand-1', { billSeriesMode: 'SHARED' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('copies the shared prefix into outlets without one when going per-outlet', async () => {
      const h = makeService();
      h.db.brand.findFirst.mockResolvedValue(brand);
      h.tx.brand.update.mockResolvedValue({ ...brand, billSeriesMode: 'PER_OUTLET', billSeriesPrefix: null });
      await h.service.update(OWNER, 'brand-1', { billSeriesMode: 'PER_OUTLET' });
      expect(h.tx.business.updateMany).toHaveBeenCalledWith({
        where: { brandId: 'brand-1', deletedAt: null, billSeriesPrefix: null },
        data: { billSeriesPrefix: 'SC/2026/' },
      });
      expect(h.db.brandEvent.create.mock.calls[0][0].data.type).toBe('BILL_SERIES_CHANGED');
    });
  });
});
