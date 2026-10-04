#!/usr/bin/env node
/**
 * Column-length guard.
 *
 * A string that fits its DTO but not its database column surfaces to the user as
 * a vague "field too long" error (Prisma P2000) after the request already passed
 * validation. This catches the two ways that happens, statically:
 *
 *  1. ERROR  - a DTO @MaxLength larger than the VarChar column it feeds.
 *  2. ERROR  - crypto.encrypt() output assigned to a VarChar column. Ciphertext
 *              (`v1:<iv>:<tag>:<data>`) is ~4x the plaintext, so those columns
 *              must be Text.
 *  3. WARN   - a string DTO field with no @MaxLength whose name matches a
 *              VarChar column on the model the DTO class maps to.
 *
 * DTO class -> model matching is by name ("BillingProfileDto" -> BillingProfile),
 * exact match first, then substring. It reads source text, so treat WARN as a
 * review list, not gospel.
 *
 * Usage:  node scripts/check-column-limits.js [--strict]
 *         --strict exits non-zero on ERRORs (use in CI). WARNs never fail.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCHEMA = path.join(ROOT, 'packages', 'database', 'prisma', 'schema.prisma');
const API_SRC = path.join(ROOT, 'apps', 'api', 'src');

const STRIP = /^(Create|Update|Patch|Admin|Submit|Save|Upsert|Add|Edit|New|Reject|Approve)+|(Dto|Request|Input|Payload|Body)$/g;

function parseSchema() {
  const models = {}; // model -> { field -> { type: 'varchar'|'text', size? } }
  let model = null;
  for (const line of fs.readFileSync(SCHEMA, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^model\s+(\w+)/);
    if (m) { model = m[1]; models[model] = {}; continue; }
    if (/^}/.test(line)) { model = null; continue; }
    if (!model) continue;
    const f = line.match(/^\s+(\w+)\s+String\??\s.*@db\.(VarChar|Text)(?:\((\d+)\))?/);
    if (f) models[model][f[1]] = f[2] === 'VarChar' ? { type: 'varchar', size: Number(f[3]) } : { type: 'text' };
  }
  return models;
}

function walk(dir, test, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') walk(p, test, out); }
    else if (test(e.name)) out.push(p);
  }
  return out;
}

function modelsForClass(models, cls) {
  const core = cls.replace(STRIP, '').replace(STRIP, '').toLowerCase();
  if (!core) return [];
  const names = Object.keys(models);
  const exact = names.filter((n) => n.toLowerCase() === core);
  if (exact.length) return exact;
  return names.filter((n) => n.toLowerCase().includes(core) || core.includes(n.toLowerCase()));
}

/** Every string DTO property with its @MaxLength (or null) and the model(s) it likely feeds. */
function scanDtos(models) {
  const props = [];
  for (const file of walk(API_SRC, (n) => /\.dto\.ts$/.test(n))) {
    const text = fs.readFileSync(file, 'utf8');
    const classRe = /export class (\w+)\s*(?:extends \w+\s*)?\{([\s\S]*?)\n\}/g;
    let cm;
    while ((cm = classRe.exec(text))) {
      const cls = cm[1];
      const matched = modelsForClass(models, cls);
      if (!matched.length) continue;
      let decos = [];
      for (const raw of cm[2].split(/\r?\n/)) {
        const l = raw.trim();
        if (l.startsWith('@')) { decos.push(l); continue; }
        const p = l.match(/^(?:readonly\s+)?(\w+)[!?]?\s*:\s*string\b/);
        if (p && decos.length) {
          const maxM = decos.join(' ').match(/MaxLength\((\d+)/);
          for (const mn of matched) {
            const col = models[mn][p[1]];
            if (col && col.type === 'varchar') {
              props.push({ file, cls, prop: p[1], max: maxM ? Number(maxM[1]) : null, model: mn, size: col.size });
            }
          }
        }
        if (l) decos = [];
      }
    }
  }
  return props;
}

/** `field: <anything>.encrypt(` assignments inside the API source. */
function scanEncryptedWrites() {
  const hits = [];
  for (const file of walk(API_SRC, (n) => n.endsWith('.ts') && !n.endsWith('.spec.ts'))) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = line.match(/^\s*(\w+)\s*:\s*[^,]*\.encrypt\(/);
      if (m) hits.push({ file, line: i + 1, field: m[1] });
    });
  }
  return hits;
}

function analyze() {
  const models = parseSchema();
  const errors = [];
  const warnings = [];
  const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

  const props = scanDtos(models);
  for (const p of props) {
    if (p.max !== null && p.max > p.size) {
      errors.push(`${rel(p.file)} ${p.cls}.${p.prop}: @MaxLength(${p.max}) > ${p.model}.${p.prop} VarChar(${p.size})`);
    } else if (p.max === null) {
      warnings.push({ ...p, text: `${rel(p.file)} ${p.cls}.${p.prop}: no @MaxLength -> ${p.model}.${p.prop} VarChar(${p.size})` });
    }
  }

  for (const w of scanEncryptedWrites()) {
    for (const [mn, fields] of Object.entries(models)) {
      const col = fields[w.field];
      if (col && col.type === 'varchar') {
        errors.push(
          `${rel(w.file)}:${w.line} encrypt() written to "${w.field}", but ${mn}.${w.field} is VarChar(${col.size}) - ciphertext is ~65+ chars; make the column Text`,
        );
      }
    }
  }

  return { errors: [...new Set(errors)], warnings };
}

module.exports = { analyze };

if (require.main === module) {
  const { errors, warnings } = analyze();
  const strict = process.argv.includes('--strict');
  if (errors.length) {
    console.log(`\nERRORS (${errors.length})`);
    errors.forEach((e) => console.log('  ' + e));
  }
  if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length}) - string DTO fields feeding a VarChar column with no @MaxLength`);
    [...new Set(warnings.map((w) => w.text))].forEach((w) => console.log('  ' + w));
  }
  if (!errors.length && !warnings.length) console.log('Column limits OK.');
  if (strict && errors.length) process.exit(1);
}
