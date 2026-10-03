import { describe, expect, it } from 'vitest';

import { Municipality, Province, Street, StreetNumberEntry } from '../../../src/domain/entities/catalog.js';

describe('catalogue entities', () => {
    it('[001:US1-S1] are immutable', () => {
        const items = [
            new Province('28', 'MADRID'),
            new Municipality({ cadastralCode: '5', ineCode: '5', provinceCode: '28', name: 'ALCALA DE HENARES' }),
            new Street('5757', 'CL', 'SERRANO'),
            new StreetNumberEntry('30', null, '1853111VK4715D'),
        ];
        expect(items.every((i) => Object.isFrozen(i))).toBe(true);
    });
});
