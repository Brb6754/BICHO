import { describe, it, expect } from 'vitest';
import { toE164Mx } from './send';

// Phone numbers arrive as people type them. Every one of these shapes is
// something a real customer has put in a form.
describe('toE164Mx', () => {
  it('adds the country code to a 10-digit local number', () => {
    expect(toE164Mx('618 123 4567')).toBe('526181234567');
    expect(toE164Mx('6181234567')).toBe('526181234567');
    expect(toE164Mx('(618) 123-4567')).toBe('526181234567');
  });

  it('keeps a number that already carries 52', () => {
    expect(toE164Mx('+52 618 123 4567')).toBe('526181234567');
  });

  it('normalises the old 521 mobile prefix to the same number', () => {
    // Otherwise the same person shows up twice in the message log.
    expect(toE164Mx('5216181234567')).toBe('526181234567');
  });

  it('refuses what cannot be dialled instead of sending into the void', () => {
    expect(toE164Mx('')).toBeNull();
    expect(toE164Mx('1234')).toBeNull();
    expect(toE164Mx('no tengo')).toBeNull();
  });
});
