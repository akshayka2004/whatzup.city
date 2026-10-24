import { MailService } from './mail.service';

const config = (values: Record<string, string>) =>
  ({ get: (k: string, d?: string) => values[k] ?? d }) as any;

describe('MailService', () => {
  const fetchMock = jest.fn();
  const env = process.env.NODE_ENV;

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  it('sends through Resend with the API key', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const svc = new MailService(config({ MAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k' }));
    await expect(svc.sendMail({ to: 'a@example.test', subject: 's', text: 't' })).resolves.toBe(
      true,
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(init.body).to).toEqual(['a@example.test']);
  });

  it('reports failure when the provider rejects', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: async () => 'bad' });
    const svc = new MailService(config({ MAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k' }));
    await expect(svc.sendMail({ to: 'a@example.test', subject: 's', text: 't' })).resolves.toBe(
      false,
    );
  });

  it('never prints mail bodies in production console mode', async () => {
    process.env.NODE_ENV = 'production';
    const svc = new MailService(config({}));
    const log = jest.spyOn((svc as any).logger, 'log');
    await expect(
      svc.sendMail({ to: 'a@example.test', subject: 's', text: 'secret-reset-link' }),
    ).resolves.toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
});
