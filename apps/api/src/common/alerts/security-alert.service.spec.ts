import { SecurityAlertService } from './security-alert.service';

function fakeRedis() {
  const store = new Map<string, number>();
  return {
    incr: jest.fn(async (k: string) => {
      const n = (store.get(k) ?? 0) + 1;
      store.set(k, n);
      return n;
    }),
    expire: jest.fn(async () => undefined),
  };
}

describe('SecurityAlertService', () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    fetchMock.mockClear();
    (global as any).fetch = fetchMock;
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://hooks.example.test/alert';
  });

  afterEach(() => {
    delete process.env.SECURITY_ALERT_WEBHOOK_URL;
  });

  it('posts once per dedupe key', async () => {
    const svc = new SecurityAlertService(fakeRedis() as any);
    await svc.alert('PRIVILEGED_ROLE_GRANTED', 'x', {}, 'user-1');
    await svc.alert('PRIVILEGED_ROLE_GRANTED', 'x', {}, 'user-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain('PRIVILEGED_ROLE_GRANTED');
  });

  it('alerts exactly when the window count reaches the threshold', async () => {
    const svc = new SecurityAlertService(fakeRedis() as any);
    for (let i = 0; i < 5; i++) {
      await svc.countAndAlert('LOGIN_FAILURE_SPIKE', 3, 3600, (n) => `${n} failures`);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not post without a webhook and never throws', async () => {
    delete process.env.SECURITY_ALERT_WEBHOOK_URL;
    const redis = fakeRedis();
    redis.incr.mockRejectedValueOnce(new Error('redis down'));
    const svc = new SecurityAlertService(redis as any);
    await expect(svc.alert('SERVER_ERROR_SPIKE', 'x', {}, 'k')).resolves.toBeUndefined();
    await svc.alert('SERVER_ERROR_SPIKE', 'y');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
