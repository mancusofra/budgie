/** Attempt to delete an item still used by transactions (it should be archived). */
export class InUseError extends Error {
  name = 'InUseError';
  constructor(
    what: string,
    readonly count: number,
  ) {
    super(`${what} is used by ${count} transactions`);
  }
}
