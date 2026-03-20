import { describe, it, expect } from 'vitest';
import { getTodayDate, TEST_DATE } from './dateHelpers';

describe('dateHelpers', () => {
  it('returns a valid Date object', () => {
    const today = getTodayDate();
    expect(today).toBeInstanceOf(Date);
  });

  it('matches TEST_DATE if defined, otherwise falls back to current Date', () => {
    const today = getTodayDate();
    if (TEST_DATE) {
      expect(today.getTime()).toBe(TEST_DATE.getTime());
    } else {
      // should be very close to new Date()
      expect(Math.abs(today.getTime() - new Date().getTime())).toBeLessThan(100);
    }
  });
});
