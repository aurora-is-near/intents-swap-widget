export const isErrorLikeObject = (
  error: unknown,
): error is { message: string; cause?: unknown } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  );
};
