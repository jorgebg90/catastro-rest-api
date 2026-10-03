import { describe, expect, it } from 'vitest';

import { createProxiedFetch } from '../../../src/infrastructure/soap/proxy.js';

describe('proxy wiring (FR-008, supports US3-S2 in production)', () => {
    it('returns a fetch function when a proxy URL is given', () => {
        expect(typeof createProxiedFetch('http://user:pass@proxy.example:8000')).toBe('function');
    });
});
