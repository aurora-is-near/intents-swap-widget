export const isErrorLikeObject = (
  error: unknown,
): error is { message: string; cause?: unknown } => {
  return (
    error instanceof Error ||
    (typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string')
  );
};
