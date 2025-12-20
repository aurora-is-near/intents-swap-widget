export type ErrorLikeObject = Error | { message: string; cause?: unknown };

export const isErrorLikeObject = (error: unknown): error is ErrorLikeObject => {
  return (
    error instanceof Error ||
    (typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string')
  );
};
