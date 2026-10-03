# Ports (SPEC-002)

```ts
// domain/ports/coordinate-gateway.ts
export interface ICoordinateGateway {
    findReference(coordinate: Coordinate): Promise<Result<ReferenceMatch, DomainError>>;
}

// application/ports/find-reference-by-coordinates-use-case.ts
export interface IFindReferenceByCoordinatesUseCase {
    execute(coordinate: Coordinate): Promise<Result<ReferenceMatch, DomainError>>;
}
```

`CatastroGetGateway` implements `ICoordinateGateway`; the use case is a thin delegate.
