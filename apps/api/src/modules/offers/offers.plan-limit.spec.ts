import { ForbiddenException } from '@nestjs/common';
import { OffersService } from './offers.service';

// These specs cover the paid plans, which are dormant unless the flag is on.
process.env.PAYMENTS_ENABLED = 'true';

const future = () => new Date(Date.now() + 10 * 86_400_000);
const past = () => new Date(Date.now() - 86_400_000);

function make(opts: { atLimit?: boolean; existing?: any } = {}) {
  const entitlements: any = {
    assertCanGoLive: jest.fn(async () => {
      if (opts.atLimit) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'limit',
          code: 'PLAN_LIMIT',
          details: {},
        });
      }
    }),
  };
  const offerRepo: any = {
    create: jest.fn(async (_t: string, d: any) => ({ id: 'o-new', ...d })),
    update: jest.fn(async (_t: string, id: string, d: any) => ({ id, ...d })),
    findOne: jest.fn(async () => opts.existing ?? null),
  };
  const redis: any = { delPattern: jest.fn(), get: jest.fn(), set: jest.fn() };
  const audit: any = { log: jest.fn() };
  const tenantResolver: any = { resolveTenantId: jest.fn(async (t: string) => t) };
  const db: any = { business: { findFirst: jest.fn(async () => ({ id: 'biz-1' })) } };
  const service = new OffersService(
    offerRepo,
    redis,
    audit,
    tenantResolver,
    db,
    {} as any,
    {} as any,
    entitlements,
  );
  return { service, entitlements, offerRepo };
}

describe('OffersService plan limits', () => {
  it('creating a live offer asks the entitlements service first', async () => {
    const { service, entitlements, offerRepo } = make();
    await service.create('t', 'u', 'biz-1', { title: 'A', endDate: future().toISOString() });
    expect(entitlements.assertCanGoLive).toHaveBeenCalledWith('biz-1', 'offer');
    expect(offerRepo.create).toHaveBeenCalled();
  });

  it('at the limit the offer is not created', async () => {
    const { service, offerRepo } = make({ atLimit: true });
    await expect(service.create('t', 'u', 'biz-1', { title: 'A' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(offerRepo.create).not.toHaveBeenCalled();
  });

  it('drafts and already-ended offers never count', async () => {
    const { service, entitlements } = make({ atLimit: true });
    await service.create('t', 'u', 'biz-1', { title: 'Draft', status: 'DRAFT' });
    await service.create('t', 'u', 'biz-1', { title: 'Old', endDate: past().toISOString() });
    expect(entitlements.assertCanGoLive).not.toHaveBeenCalled();
  });

  it('resuming a paused offer is checked, excluding itself', async () => {
    const existing = { id: 'o1', businessId: 'biz-1', status: 'PAUSED', endDate: future() };
    const { service, entitlements } = make({ existing });
    await service.update('t', 'o1', 'u', { status: 'ACTIVE' });
    expect(entitlements.assertCanGoLive).toHaveBeenCalledWith('biz-1', 'offer', 'o1');
  });

  it('resume is blocked at the limit and nothing is written', async () => {
    const existing = { id: 'o1', businessId: 'biz-1', status: 'PAUSED', endDate: future() };
    const { service, offerRepo } = make({ atLimit: true, existing });
    await expect(service.update('t', 'o1', 'u', { status: 'ACTIVE' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(offerRepo.update).not.toHaveBeenCalled();
  });

  it('editing an offer that is already live never blocks', async () => {
    const existing = { id: 'o1', businessId: 'biz-1', status: 'ACTIVE', endDate: future() };
    const { service, entitlements, offerRepo } = make({ atLimit: true, existing });
    await service.update('t', 'o1', 'u', { title: 'New title' });
    expect(entitlements.assertCanGoLive).not.toHaveBeenCalled();
    expect(offerRepo.update).toHaveBeenCalled();
  });

  it('pausing is always allowed', async () => {
    const existing = { id: 'o1', businessId: 'biz-1', status: 'ACTIVE', endDate: future() };
    const { service, entitlements } = make({ atLimit: true, existing });
    await service.update('t', 'o1', 'u', { status: 'PAUSED' });
    expect(entitlements.assertCanGoLive).not.toHaveBeenCalled();
  });
});
