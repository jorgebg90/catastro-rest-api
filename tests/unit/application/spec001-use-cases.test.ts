import { describe, expect, it, vi } from 'vitest';

import {
    ListMunicipalitiesUseCase,
    ListProvincesUseCase,
    ListStreetNumbersUseCase,
    ListStreetsUseCase,
} from '../../../src/application/use-cases/catalog.use-cases.js';
import {
    SearchPropertiesByAddressUseCase,
    SearchPropertiesByParcelUseCase,
} from '../../../src/application/use-cases/search-properties.use-cases.js';
import { Province } from '../../../src/domain/entities/catalog.js';
import { CatalogEntryNotFoundError } from '../../../src/domain/errors/index.js';
import type { ICatalogGateway } from '../../../src/domain/ports/catalog-gateway.js';
import type { IPropertySearchGateway } from '../../../src/domain/ports/property-search-gateway.js';
import { err, ok } from '../../../src/domain/result.js';
import { AddressQuery, MunicipalityQuery, ParcelQuery, StreetNumberQuery, StreetQuery } from '../../../src/domain/value-objects/queries.js';

const unwrap = <T, E>(r: { ok: true; value: T } | { ok: false; error: E }): T => {
    if (!r.ok) throw new Error('unexpected');
    return r.value;
};
const loc = { province: 'MADRID', municipality: 'MADRID' };
const street = { ...loc, streetType: 'CL', streetName: 'SERRANO' };

describe('catalogue use cases delegate to the gateway', () => {
    const gateway: ICatalogGateway = {
        listProvinces: vi.fn(async () => ok([new Province('28', 'MADRID')])),
        listMunicipalities: vi.fn(async () => ok([])),
        listStreets: vi.fn(async () => ok([])),
        listStreetNumbers: vi.fn(async () => err(new CatalogEntryNotFoundError('none'))),
    };

    it('[001:US1-S1] ListProvincesUseCase', async () => {
        const r = await new ListProvincesUseCase(gateway).execute();
        expect(r.ok && r.value).toHaveLength(1);
    });

    it('[001:US1-S2] ListMunicipalitiesUseCase', async () => {
        const q = unwrap(MunicipalityQuery.from(loc));
        await new ListMunicipalitiesUseCase(gateway).execute(q);
        expect(gateway.listMunicipalities).toHaveBeenCalledWith(q);
    });

    it('[001:US1-S3] ListStreetsUseCase', async () => {
        const q = unwrap(StreetQuery.from(street));
        await new ListStreetsUseCase(gateway).execute(q);
        expect(gateway.listStreets).toHaveBeenCalledWith(q);
    });

    it('[001:US1-S4] ListStreetNumbersUseCase propagates gateway failures', async () => {
        const r = await new ListStreetNumbersUseCase(gateway).execute(unwrap(StreetNumberQuery.from({ ...street, number: '30' })));
        expect(!r.ok && r.error).toBeInstanceOf(CatalogEntryNotFoundError);
    });
});

describe('search use cases delegate to the gateway', () => {
    const gateway: IPropertySearchGateway = {
        searchByAddress: vi.fn(async () => ok([])),
        searchByParcel: vi.fn(async () => ok([])),
    };

    it('[001:US2-S1] SearchPropertiesByAddressUseCase', async () => {
        const q = unwrap(AddressQuery.from({ ...street, number: '30' }));
        await new SearchPropertiesByAddressUseCase(gateway).execute(q);
        expect(gateway.searchByAddress).toHaveBeenCalledWith(q);
    });

    it('[001:US2-S3] SearchPropertiesByParcelUseCase', async () => {
        const q = unwrap(ParcelQuery.from({ ...loc, polygon: '1', parcel: '1' }));
        await new SearchPropertiesByParcelUseCase(gateway).execute(q);
        expect(gateway.searchByParcel).toHaveBeenCalledWith(q);
    });
});
