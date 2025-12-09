export class MockCancelablePromise<T> implements Promise<T> {
  private _isCancelled = false;

  private _isResolved = false;

  private _isRejected = false;

  private _cancelHandler?: () => void;

  private _promise: Promise<T>;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: unknown) => void,
      onCancel: (cancelHandler: () => void) => void,
    ) => void,
  ) {
    this._promise = new Promise<T>((resolve, reject) => {
      const onCancel = (handler: () => void) => {
        this._cancelHandler = handler;
      };

      executor(
        (value) => {
          this._isResolved = true;
          resolve(value);
        },
        (reason) => {
          this._isRejected = true;
          reject(reason);
        },
        onCancel,
      );
    });
  }

  get isCancelled() {
    return this._isCancelled;
  }

  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;

      if (this._cancelHandler) {
        this._cancelHandler();
      }
    }
  }

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onFulfilled, onRejected);
  }

  catch<TResult = never>(
    onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this._promise.catch(onRejected);
  }

  finally(onFinally?: (() => void) | null): Promise<T> {
    return this._promise.finally(onFinally);
  }

  get [Symbol.toStringTag]() {
    return 'CancelablePromise';
  }
}
