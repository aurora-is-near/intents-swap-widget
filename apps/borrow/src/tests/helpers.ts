import { screen, within } from '@testing-library/react';

/** A promise to settle from the test. */
export const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

/** Each loan progress step's label with its status, as a screen reader reads it. */
export const stepTexts = () =>
  within(screen.getByRole('list', { name: 'Loan progress' }))
    .getAllByRole('listitem')
    .map((item) => {
      // The waiting step's number is decorative.
      const read = item.cloneNode(true) as HTMLElement;

      read.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
        hidden.remove();
      });

      return read.textContent;
    });
