import { describe, expect, it } from 'vitest';
import { inActiveHours, nextRun } from './schedule';
describe('schedule', () => {
  it('calculates intervals', () => expect(nextRun(new Date('2026-09-08T09:00:00Z'), 'interval', 30)?.toISOString()).toBe('2026-09-08T09:30:00.000Z'));
  it('moves fixed times to tomorrow after the time passed', () => expect(nextRun(new Date('2026-09-08T10:00:00Z'), 'fixed', null, '09:30')?.getDate()).toBe(9));
  it('supports overnight active windows', () => { expect(inActiveHours(new Date('2026-09-08T23:00:00'), '22:00', '06:00')).toBe(true); expect(inActiveHours(new Date('2026-09-08T12:00:00'), '22:00', '06:00')).toBe(false); });
});
