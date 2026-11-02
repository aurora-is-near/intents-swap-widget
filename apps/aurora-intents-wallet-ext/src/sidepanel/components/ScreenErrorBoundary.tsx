import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { Banner, Button } from '@aurora-is-near/intents-swap-widget';

import { Screen } from './Screen';
import { StatusHero } from './StatusHero';

type Props = {
  children: ReactNode;
  onHome: () => void;
};

type State = { error: Error | null };

/**
 * Keeps a render error in one screen from blanking the whole panel. Mount it
 * keyed by the screen so navigating away clears it.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Screen crashed', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    const { children, onHome } = this.props;

    if (!error) {
      return children;
    }

    return (
      <Screen
        title="Something went wrong"
        footer={
          <Button variant="primary" size="lg" onClick={onHome}>
            Back to wallet
          </Button>
        }>
        <StatusHero
          tone="error"
          title="This screen couldn’t be shown"
          description="Your funds are not affected. Going back to the wallet usually fixes it."
        />
        <Banner
          className="wrap-banner"
          variant="error"
          message={error.message}
          hasBg
          multiline
        />
      </Screen>
    );
  }
}
