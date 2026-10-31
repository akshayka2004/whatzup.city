import { NotificationAudienceService } from './notification-audience.service';

function world() {
  const users = [
    { id: 'sa', tenantId: 'tp', role: 'SUPER_ADMIN', grants: null },
    { id: 'ma', tenantId: 'tp', role: 'MASTER_ADMIN', grants: null },
    // Platform staff with an explicit access list: support only.
    { id: 'agent', tenantId: 'tp', role: 'PLATFORM_STAFF', grants: { support: 'manage' } },
    // Old staff account with no list keeps the legacy access (events, no support).
    { id: 'legacy', tenantId: 'tp', role: 'PLATFORM_STAFF', grants: null },
  ];
  const db: any = {
    user: {
      findMany: jest.fn(async ({ where }: any) => {
        if (where.role) return users;
        const ids: string[] = where.id.in;
        return [
          ...users,
          { id: 'owner', tenantId: 'tb' },
          { id: 'mod', tenantId: 'tb' },
          { id: 'cust', tenantId: 'tp' },
        ]
          .filter((u) => ids.includes(u.id))
          .map((u) => ({ id: u.id, tenantId: u.tenantId }));
      }),
    },
    business: {
      findFirst: jest.fn(async () => ({
        ownerId: 'owner',
        staff: [{ userId: 'mod' }],
      })),
    },
  };
  const notifications: any = { send: jest.fn(async () => ({})) };
  const svc = new NotificationAudienceService(db, notifications);
  return { svc, db, notifications };
}

describe('who a notice goes to', () => {
  it('sends platform notices only to staff who can open that area', async () => {
    const { svc } = world();
    const support = (await svc.platformStaff('support')).map((r) => r.id);
    expect(support.sort()).toEqual(['agent', 'ma', 'sa']);
    const events = (await svc.platformStaff('events')).map((r) => r.id);
    expect(events).toContain('legacy');
    expect(events).not.toContain('agent');
    // manage is stricter than view
    const reports = (await svc.platformStaff('reports', 'manage')).map((r) => r.id);
    expect(reports).toEqual(expect.arrayContaining(['sa', 'ma']));
    expect(reports).not.toContain('agent');
  });

  it("reaches a business's owner and moderators in their own tenant", async () => {
    const { svc } = world();
    const team = await svc.businessTeam('b1');
    expect(team).toEqual(
      expect.arrayContaining([
        { id: 'owner', tenantId: 'tb' },
        { id: 'mod', tenantId: 'tb' },
      ]),
    );
  });

  it('leaves out the person who did it and sends each person once', async () => {
    const { svc, notifications } = world();
    const sent = await svc.tell(
      [
        { id: 'a', tenantId: 't1' },
        { id: 'a', tenantId: 't1' },
        { id: 'b', tenantId: 't2' },
        { id: 'me', tenantId: 't1' },
      ],
      { title: 'Hello', body: 'World', type: 'TEST', url: '/somewhere' },
      { except: ['me'] },
    );
    expect(sent).toBe(2);
    const calls = notifications.send.mock.calls.map((c: any[]) => c[0]);
    expect(calls.map((c: any) => [c.userId, c.tenantId])).toEqual([
      ['a', 't1'],
      ['b', 't2'],
    ]);
    expect(calls[0].metadata.url).toBe('/somewhere');
  });

  it('never throws, so a failed notice cannot fail the action behind it', async () => {
    const { svc, notifications, db } = world();
    notifications.send.mockRejectedValue(new Error('queue down'));
    await expect(
      svc.tell([{ id: 'a', tenantId: 't1' }], { title: 't', body: 'b', type: 'X' }),
    ).resolves.toBe(0);
    db.user.findMany.mockRejectedValue(new Error('db down'));
    await expect(
      svc.tellStaff('support', { title: 't', body: 'b', type: 'X' }),
    ).resolves.toBeUndefined();
    await expect(svc.tellTeam('b1', { title: 't', body: 'b', type: 'X' })).resolves.toBeUndefined();
  });
});
