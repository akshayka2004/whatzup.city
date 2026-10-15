import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';
import { decryptComplianceDeep, encryptCompliance } from './compliance-fields';

const crypto = new CryptoService({
  get: () => 'a'.repeat(64),
} as unknown as ConfigService);

describe('compliance encryption', () => {
  const plain = {
    pan: { has: true, number: 'ABCDE1234F', nameAsPerPan: 'Casa Mi Amor' },
    gst: { has: true, gstin: '32ABCDE1234F1Z5', legalName: 'Casa' },
  };

  it('encrypts only the identity numbers', () => {
    const enc = encryptCompliance(plain, crypto) as any;
    expect(enc.pan.number).toMatch(/^v1:/);
    expect(enc.gst.gstin).toMatch(/^v1:/);
    expect(enc.pan.nameAsPerPan).toBe('Casa Mi Amor');
    expect(enc.gst.legalName).toBe('Casa');
  });

  it('does not double-encrypt', () => {
    const once = encryptCompliance(plain, crypto) as any;
    const twice = encryptCompliance(once, crypto) as any;
    expect(twice.pan.number).toBe(once.pan.number);
  });

  it('decrypts compliance anywhere in a response and leaves the rest alone', () => {
    const enc = encryptCompliance(plain, crypto);
    const body = { data: [{ id: 'b1', name: 'Casa', compliance: enc }], meta: { total: 1 } };
    const out = decryptComplianceDeep(body, crypto) as any;
    expect(out.data[0].compliance).toEqual(plain);
    expect(out.meta).toBe(body.meta);
  });

  it('passes legacy plaintext through', () => {
    const out = decryptComplianceDeep({ compliance: plain }, crypto) as any;
    expect(out.compliance).toEqual(plain);
  });
});
