# Ports: SPEC-001

## Outbound (domain/ports)
```ts
interface ICatalogGateway {
    listProvinces(): Promise<Result<readonly Province[], DomainError>>;
    listMunicipalities(q: MunicipalityQuery): Promise<Result<readonly Municipality[], DomainError>>;
    listStreets(q: StreetQuery): Promise<Result<readonly Street[], DomainError>>;
    listStreetNumbers(q: StreetNumberQuery): Promise<Result<readonly StreetNumberEntry[], DomainError>>;
}
interface IPropertySearchGateway {
    searchByAddress(q: AddressQuery): Promise<Result<readonly PropertyRecord[], DomainError>>;
    searchByParcel(q: ParcelQuery): Promise<Result<readonly PropertyRecord[], DomainError>>;
}
```

## Inbound (application/ports)
One interface per use case, each `execute(query): Promise<Result<T, DomainError>>`:
`IListProvincesUseCase`, `IListMunicipalitiesUseCase`, `IListStreetsUseCase`, `IListStreetNumbersUseCase`, `ISearchPropertiesByAddressUseCase`, `ISearchPropertiesByParcelUseCase`.
Each implementation cites its scenario IDs in its docstring.
