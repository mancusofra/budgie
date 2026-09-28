/** Tentativo di eliminare un elemento ancora usato da transazioni (va archiviato). */
export class InUseError extends Error {
  name = 'InUseError';
  constructor(
    what: string,
    readonly count: number,
  ) {
    super(`${what} è usato da ${count} transazioni`);
  }
}
