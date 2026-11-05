import { Component, type ReactNode } from 'react';

import { Button, Notice } from './ui';

type Props = {
  children: ReactNode;
  /** Starts the content over, e.g. by closing the dialog. */
  onReset: () => void;
};

/**
 * A render error stays inside the dialog: the page and any running supply
 * are untouched, and the user gets a way out.
 */
export class ErrorBoundary extends Component<Props, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[Aurora Intents]', error);
  }

  render() {
    const { error } = this.state;
    const { children, onReset } = this.props;

    if (!error) {
      return children;
    }

    return (
      <div className="flex flex-col gap-3">
        <Notice tone="warning">
          <p className="font-medium">Something went wrong here</p>
          <p className="mt-1 break-words text-text-secondary">
            {error.message}
          </p>
        </Notice>
        <Button
          variant="primary"
          onClick={() => {
            this.setState({ error: undefined });
            onReset();
          }}>
          Close
        </Button>
      </div>
    );
  }
}
