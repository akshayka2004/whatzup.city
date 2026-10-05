import {
  validateOperatingHours,
  getOpenStatus,
  hasOperatingHours,
  defaultOperatingHours,
  formatTime12,
  OperatingHours,
} from '@saas/types';

function hoursWith(patch: Partial<OperatingHours['weekly']>, closures: OperatingHours['closures'] = []): OperatingHours {
  const base = defaultOperatingHours();
  return { ...base, weekly: { ...base.weekly, ...patch }, closures };
}

// IST = UTC+5:30. 2026-10-05 is a Monday.
const mondayIst = (hhmm: string) => new Date(`2026-10-05T${hhmm}:00+05:30`);

describe('validateOperatingHours', () => {
  it('accepts the default schedule', () => {
    const r = validateOperatingHours(defaultOperatingHours());
    expect(r.ok).toBe(true);
  });

  it('accepts two shifts on a day and sorts them', () => {
    const r = validateOperatingHours(
      hoursWith({ mon: { closed: false, shifts: [{ open: '16:00', close: '21:00' }, { open: '09:00', close: '13:00' }] } }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.weekly.mon.shifts.map((s) => s.open)).toEqual(['09:00', '16:00']);
  });

  it('rejects overlapping shifts', () => {
    const r = validateOperatingHours(
      hoursWith({ mon: { closed: false, shifts: [{ open: '09:00', close: '14:00' }, { open: '13:00', close: '18:00' }] } }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects a shift that closes before it opens and bad time formats', () => {
    expect(validateOperatingHours(hoursWith({ mon: { closed: false, shifts: [{ open: '18:00', close: '09:00' }] } })).ok).toBe(false);
    expect(validateOperatingHours(hoursWith({ mon: { closed: false, shifts: [{ open: '9:00', close: '17:00' }] } })).ok).toBe(false);
  });

  it('allows 24:00 as a closing time', () => {
    expect(validateOperatingHours(hoursWith({ fri: { closed: false, shifts: [{ open: '18:00', close: '24:00' }] } })).ok).toBe(true);
  });

  it('requires a shift on an open day, but not on a closed day', () => {
    expect(validateOperatingHours(hoursWith({ mon: { closed: false, shifts: [] } })).ok).toBe(false);
    expect(validateOperatingHours(hoursWith({ mon: { closed: true, shifts: [] } })).ok).toBe(true);
  });

  it('limits shifts per day and closures', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ open: `0${i}:00`, close: `0${i}:30` }));
    expect(validateOperatingHours(hoursWith({ mon: { closed: false, shifts: five } })).ok).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, from: '2026-11-01', to: '2026-11-01', reason: '' }));
    expect(validateOperatingHours(hoursWith({}, many)).ok).toBe(false);
  });

  it('validates closure dates', () => {
    expect(validateOperatingHours(hoursWith({}, [{ id: 'a', from: '2026-11-03', to: '2026-11-01', reason: 'x' }])).ok).toBe(false);
    expect(validateOperatingHours(hoursWith({}, [{ id: 'a', from: '2026-02-30', to: '2026-02-30', reason: 'x' }])).ok).toBe(false);
    expect(validateOperatingHours(hoursWith({}, [{ id: 'a', from: '2026-11-01', to: '2026-11-03', reason: 'Diwali' }])).ok).toBe(true);
  });

  it('rejects non-objects and drops unknown keys', () => {
    expect(validateOperatingHours('nope').ok).toBe(false);
    expect(validateOperatingHours([]).ok).toBe(false);
    const r = validateOperatingHours({ ...defaultOperatingHours(), injected: '<script>' });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.value as any).injected).toBeUndefined();
  });
});

describe('getOpenStatus', () => {
  const split = hoursWith({ mon: { closed: false, shifts: [{ open: '09:00', close: '13:00' }, { open: '16:00', close: '21:00' }] } });

  it('is open inside a shift and names when it closes', () => {
    const s = getOpenStatus(split, mondayIst('10:30'));
    expect(s?.isOpen).toBe(true);
    expect(s?.label).toBe('Open now · closes 1:00 PM');
  });

  it('is closed in the gap between shifts and names the next opening', () => {
    const s = getOpenStatus(split, mondayIst('14:00'));
    expect(s?.isOpen).toBe(false);
    expect(s?.label).toBe('Closed · opens 4:00 PM');
  });

  it('looks ahead to the next open day', () => {
    const s = getOpenStatus(hoursWith({ mon: { closed: false, shifts: [{ open: '09:00', close: '13:00' }] }, tue: { closed: false, shifts: [{ open: '08:00', close: '12:00' }] } }), mondayIst('20:00'));
    expect(s?.isOpen).toBe(false);
    expect(s?.label).toBe('Closed · opens tomorrow 8:00 AM');
  });

  it('is closed on a weekly day off', () => {
    const s = getOpenStatus(hoursWith({ mon: { closed: true, shifts: [] } }), mondayIst('11:00'));
    expect(s?.isOpen).toBe(false);
  });

  it('a special closure overrides an open day and is skipped when looking ahead', () => {
    const closed = hoursWith({}, [{ id: 'c', from: '2026-10-05', to: '2026-10-06', reason: 'Renovation' }]);
    const s = getOpenStatus(closed, mondayIst('11:00'));
    expect(s?.isOpen).toBe(false);
    expect(s?.closure?.reason).toBe('Renovation');
    expect(s?.label).toBe('Closed · opens Wed 9:00 AM');
  });

  it('returns null for unusable data', () => {
    expect(getOpenStatus(null)).toBeNull();
    expect(getOpenStatus({})).not.toBeNull();
  });

  it('uses IST, not the server clock: 20:00 UTC on Sunday is already Monday 01:30 IST', () => {
    const s = getOpenStatus(hoursWith({ mon: { closed: false, shifts: [{ open: '00:00', close: '24:00' }] } }), new Date('2026-10-04T20:00:00Z'));
    expect(s?.isOpen).toBe(true);
  });
});

describe('helpers', () => {
  it('hasOperatingHours', () => {
    expect(hasOperatingHours(null)).toBe(false);
    expect(hasOperatingHours(defaultOperatingHours())).toBe(true);
  });
  it('formatTime12', () => {
    expect(formatTime12('00:00')).toBe('12:00 AM');
    expect(formatTime12('12:05')).toBe('12:05 PM');
    expect(formatTime12('24:00')).toBe('12:00 AM');
    expect(formatTime12('21:30')).toBe('9:30 PM');
  });
});
