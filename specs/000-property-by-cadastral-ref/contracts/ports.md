# Port Contracts

```ts
// src/domain/ports/cadastre-gateway.ts (outbound)
interface ICadastreGateway {
  queryByReference(reference: CadastralReference): Promise<Result<ReadonlyArray<PropertyRecord>, DomainError>>;
}

// src/application/ports/get-property-by-ref-use-case.ts (inbound)
interface IGetPropertyByRefUseCase {
  execute(reference: CadastralReference): Promise<Result<ReadonlyArray<PropertyRecord>, DomainError>>;
}
```

Rules: the presentation layer builds the `CadastralReference` (validation) before calling the use case; ports never throw for expected failures; adapters map transport/SOAP faults to `DomainError` subclasses; the domain imports nothing outside `src/domain`.
