import type { CryptoService } from './crypto.service';

// Identity numbers inside Business.compliance that are encrypted at rest.
// Names, registration type and the has-flags stay readable for admin review.
const SECRET_PATHS: Array<[section: string, key: string]> = [
  ['pan', 'number'],
  ['gst', 'gstin'],
];

type Transform = (v: string | null) => string | null;

function mapSecrets(compliance: unknown, fn: Transform): unknown {
  if (!compliance || typeof compliance !== 'object' || Array.isArray(compliance)) return compliance;
  const out: Record<string, any> = { ...(compliance as Record<string, any>) };
  for (const [section, key] of SECRET_PATHS) {
    const s = out[section];
    if (s && typeof s === 'object' && typeof s[key] === 'string' && s[key] !== '') {
      out[section] = { ...s, [key]: fn(s[key]) };
    }
  }
  return out;
}

/** Before writing Business.compliance. Already-encrypted values are left as they are. */
export function encryptCompliance(compliance: unknown, crypto: CryptoService): unknown {
  return mapSecrets(compliance, (v) => (v && v.startsWith('v1:') ? v : crypto.encrypt(v)));
}

/** For owner/admin responses. Legacy plaintext passes through unchanged. */
export function decryptCompliance(compliance: unknown, crypto: CryptoService): unknown {
  return mapSecrets(compliance, (v) => crypto.decrypt(v));
}

/**
 * Walks a response body and decrypts every `compliance` object it finds.
 * Bounded depth and node count keep it cheap on large list responses.
 */
export function decryptComplianceDeep(body: unknown, crypto: CryptoService): unknown {
  let budget = 20_000;
  const walk = (node: unknown, depth: number): unknown => {
    if (budget-- <= 0 || depth > 8 || node === null || typeof node !== 'object') return node;
    if (node instanceof Date || Buffer.isBuffer(node)) return node;
    if (Array.isArray(node)) {
      let changed = false;
      const arr = node.map((v) => {
        const w = walk(v, depth + 1);
        if (w !== v) changed = true;
        return w;
      });
      return changed ? arr : node;
    }
    let out: Record<string, any> | null = null;
    for (const [k, v] of Object.entries(node as Record<string, any>)) {
      const w = k === 'compliance' ? decryptCompliance(v, crypto) : walk(v, depth + 1);
      if (w !== v) {
        out = out ?? { ...(node as Record<string, any>) };
        out[k] = w;
      }
    }
    return out ?? node;
  };
  return walk(body, 0);
}
