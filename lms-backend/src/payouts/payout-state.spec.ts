import { canTransition } from './payout-state';
import { PayoutStatus as S } from './payouts.enums';

describe('payout lifecycle', () => {
  it('allows the normal path', () => {
    expect(canTransition(S.PENDING, S.APPROVED)).toBe(true);
    expect(canTransition(S.APPROVED, S.PROCESSING)).toBe(true);
    expect(canTransition(S.PROCESSING, S.PAID)).toBe(true);
  });

  it('allows retry and cancel of a failed payout', () => {
    expect(canTransition(S.PROCESSING, S.FAILED)).toBe(true);
    expect(canTransition(S.FAILED, S.PROCESSING)).toBe(true);
    expect(canTransition(S.FAILED, S.REJECTED)).toBe(true);
  });

  it('only allows reversing a paid payout', () => {
    expect(canTransition(S.PAID, S.REVERSED)).toBe(true);
    expect(canTransition(S.PENDING, S.REVERSED)).toBe(false);
  });

  it('never leaves a terminal state or skips steps', () => {
    expect(canTransition(S.REJECTED, S.APPROVED)).toBe(false);
    expect(canTransition(S.REVERSED, S.PAID)).toBe(false);
    expect(canTransition(S.PENDING, S.PAID)).toBe(false);
    expect(canTransition(S.PAID, S.PROCESSING)).toBe(false);
  });
});