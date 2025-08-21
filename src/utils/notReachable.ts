type Options = {
  throwError?: boolean;
};

export function notReachable(_: never, options?: { throwError?: true }): never;
export function notReachable(_: never, options?: { throwError: false }): void;

export function notReachable(
  _: never,
  options: Options = { throwError: true },
) {
  const message = `Should not be reached ${_ as unknown as string}`;

  if (options.throwError) {
    throw new Error(message);
  }
}
