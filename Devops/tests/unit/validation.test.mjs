import { describe, expect, it } from 'vitest';

function normalizeIndianPhone(value) {
    const compact = String(value || '').replace(/[\s()-]/g, '');
    let national = compact.startsWith('+91') ? compact.slice(3) : compact;
    if (national.startsWith('0')) national = national.slice(1);
    return /^[6-9]\d{9}$/.test(national) ? national : null;
}

describe('Unit Tests - Validation & Helpers', () => {
    it('normalizes valid Indian mobile numbers', () => {
        expect(normalizeIndianPhone('+91 9876543210')).toBe('9876543210');
        expect(normalizeIndianPhone('98765-43210')).toBe('9876543210');
        expect(normalizeIndianPhone('(0) 9876543210')).toBe('9876543210');
        expect(normalizeIndianPhone('8123456789')).toBe('8123456789');
    });

    it('rejects invalid mobile numbers', () => {
        expect(normalizeIndianPhone('1234567890')).toBeNull();
        expect(normalizeIndianPhone('+1 9876543210')).toBeNull();
        expect(normalizeIndianPhone('98765')).toBeNull();
        expect(normalizeIndianPhone('')).toBeNull();
        expect(normalizeIndianPhone(null)).toBeNull();
    });
});
