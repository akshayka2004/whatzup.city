import { NotFoundException } from '@nestjs/common';
import { BillsService } from './bills.service';

function makeService(opts: { series?: any; dupes?: any[] } = {}) {
  const billRepo: any = { create: jest.fn(async (_t, data) => ({ id: 'bill-1', ...data })) };
  const verificationRepo: any = { create: jest.fn() };
  const audit: any = { log: jest.fn() };
  const storage: any = { createSignedDownloadUrl: jest.fn(async () => 'https://signed') };
  const ocrQueue: any = { add: jest.fn() };
  const customers: any = { trackInteraction: jest.fn() };
  const analytics: any = { refreshUserSpending: jest.fn(async () => {}), refreshBusinessSummary: jest.fn(async () => {}) };
  const db: any = { business: { findFirst: jest.fn(async () => ({ id: 'biz-1', ownerId: 'owner-1', tenantId: 'ten-1' })) } };
  const notifications: any = { send: jest.fn() };
  const fraud: any = { findDuplicateBills: jest.fn(async () => opts.dupes ?? []) };
  const brandScope: any = {
    resolveBillSeries: jest.fn(async () => opts.series ?? { mode: 'SINGLE', prefix: null, brandId: null, outletIds: ['biz-1'] }),
  };
  const service = new BillsService(
    billRepo, verificationRepo, audit, storage, ocrQueue, customers, analytics, db, notifications, fraud, brandScope,
  );
  return { service, billRepo, verificationRepo, fraud, brandScope, notifications, db };
}

const dto = {
  businessId: 'biz-1',
  amount: 450,
  billDate: '2026-10-01',
  billImage: 'cust/bill.jpg',
  billNumber: ' sc/2026/0042 ',
};

describe('BillsService.upload', () => {
  it('stores the normalised bill number and queues a PENDING verification when nothing duplicates it', async () => {
    const h = makeService();
    await h.service.upload('t-cust', 'cust-1', dto as any);

    expect(h.billRepo.create.mock.calls[0][1].billNumber).toBe('SC/2026/0042');
    expect(h.fraud.findDuplicateBills).toHaveBeenCalledWith({ billId: 'bill-1', billNumber: 'SC/2026/0042', businessIds: ['biz-1'] });
    expect(h.verificationRepo.create.mock.calls[0][1]).toMatchObject({ billId: 'bill-1', businessId: 'biz-1', status: 'PENDING' });
  });

  it('checks every outlet of the brand when the series is shared', async () => {
    const h = makeService({ series: { mode: 'SHARED', prefix: 'SC/2026/', brandId: 'b', outletIds: ['biz-1', 'biz-2', 'biz-3'] } });
    await h.service.upload('t-cust', 'cust-1', dto as any);
    expect(h.fraud.findDuplicateBills.mock.calls[0][0].businessIds).toEqual(['biz-1', 'biz-2', 'biz-3']);
  });

  it('checks only its own outlet when each outlet keeps its own series', async () => {
    const h = makeService({ series: { mode: 'PER_OUTLET', prefix: 'A/', brandId: 'b', outletIds: ['biz-1', 'biz-2'] } });
    await h.service.upload('t-cust', 'cust-1', dto as any);
    expect(h.fraud.findDuplicateBills.mock.calls[0][0].businessIds).toEqual(['biz-1']);
  });

  it('flags a duplicate straight away and tells the owner', async () => {
    const h = makeService({
      dupes: [{ id: 'old', businessId: 'biz-2', createdAt: new Date('2026-09-30T10:00:00Z'), business: { name: 'X - B', outletLabel: 'Beach Road' } }],
    });
    await h.service.upload('t-cust', 'cust-1', dto as any);

    const created = h.verificationRepo.create.mock.calls[0][1];
    expect(created).toMatchObject({ status: 'FLAGGED', escalationLevel: 'BUSINESS' });
    expect(created.rejectionReason).toContain('Duplicate bill number SC/2026/0042');
    expect(created.rejectionReason).toContain('Beach Road');
    expect(h.notifications.send.mock.calls[0][0].title).toBe('Duplicate Bill Flagged');
  });

  it('skips the duplicate check when the customer left the invoice number blank', async () => {
    const h = makeService();
    await h.service.upload('t-cust', 'cust-1', { ...dto, billNumber: undefined } as any);
    expect(h.fraud.findDuplicateBills).not.toHaveBeenCalled();
  });

  it('rejects an unknown business', async () => {
    const h = makeService();
    h.db.business.findFirst.mockResolvedValueOnce(null);
    await expect(h.service.upload('t-cust', 'cust-1', dto as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
