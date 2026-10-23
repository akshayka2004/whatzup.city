import { RetentionService, TOKEN_GRACE_DAYS } from './retention.service';

const DAY = 24 * 60 * 60 * 1000;

function makeDb() {
  const del = () => jest.fn().mockResolvedValue({ count: 1 });
  return {
    refreshToken: { deleteMany: del() },
    session: { deleteMany: del() },
    analyticsEvent: { deleteMany: del() },
    auditLog: { deleteMany: del() },
  };
}

describe('RetentionService.purge', () => {
  const now = new Date('2026-10-23T00:00:00Z');

  afterEach(() => {
    delete process.env.ANALYTICS_RETENTION_DAYS;
    delete process.env.AUDIT_RETENTION_DAYS;
  });

  it('removes credentials past the grace period and keeps analytics/audit by default', async () => {
    const db = makeDb();
    const svc = new RetentionService(db as any, {} as any);
    const res = await svc.purge(now);

    const cutoff = new Date(now.getTime() - TOKEN_GRACE_DAYS * DAY);
    expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ expiresAt: { lt: cutoff } }, { isRevoked: true, createdAt: { lt: cutoff } }],
      },
    });
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: cutoff } } });
    expect(db.analyticsEvent.deleteMany).not.toHaveBeenCalled();
    expect(db.auditLog.deleteMany).not.toHaveBeenCalled();
    expect(res).toEqual({ refreshTokens: 1, sessions: 1, analyticsEvents: 0, auditLogs: 0 });
  });

  it('applies the optional analytics and audit windows when configured', async () => {
    process.env.ANALYTICS_RETENTION_DAYS = '400';
    process.env.AUDIT_RETENTION_DAYS = '730';
    const db = makeDb();
    await new RetentionService(db as any, {} as any).purge(now);

    expect(db.analyticsEvent.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date(now.getTime() - 400 * DAY) } },
    });
    expect(db.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date(now.getTime() - 730 * DAY) } },
    });
  });

  it('ignores invalid window values', async () => {
    process.env.ANALYTICS_RETENTION_DAYS = 'forever';
    const db = makeDb();
    await new RetentionService(db as any, {} as any).purge(now);
    expect(db.analyticsEvent.deleteMany).not.toHaveBeenCalled();
  });
});
