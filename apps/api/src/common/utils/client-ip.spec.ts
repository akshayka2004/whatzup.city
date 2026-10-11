import { clientIp, forwardedIp, isLocalPeer } from './client-ip';

const req = (remoteAddress: string | undefined, headers: Record<string, string> = {}) => ({
  headers,
  socket: { remoteAddress },
});

describe('clientIp', () => {
  it('uses Cloudflare header when the peer is our local proxy', () => {
    const r = req('127.0.0.1', {
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
    });
    expect(clientIp(r)).toBe('203.0.113.7');
  });

  it('falls back to the first X-Forwarded-For entry behind a local proxy', () => {
    expect(clientIp(req('::ffff:127.0.0.1', { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe(
      '198.51.100.1',
    );
  });

  it('ignores proxy headers from a remote peer so they cannot be spoofed', () => {
    expect(clientIp(req('192.0.2.50', { 'cf-connecting-ip': '203.0.113.7' }))).toBe('192.0.2.50');
  });

  it('treats a local peer without proxy headers as an internal call', () => {
    const r = req('::1');
    expect(isLocalPeer(r)).toBe(true);
    expect(forwardedIp(r)).toBeUndefined();
    expect(clientIp(r)).toBe('::1');
  });
});
