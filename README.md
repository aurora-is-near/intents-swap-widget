# Aurora Staking SDK

A React library that contains logic for staking and unstaking AURORA.

This repository enforces semantic commit messages. For more details and examples
see the
[Conventional Commits Specification](https://www.conventionalcommits.org).

## Installation

```sh
yarn add @aurora-is-near/staking
```

## Usage

Wrap your application in a `StakingProvider`:

```tsx
import { StakingProvider } from '@aurora-is-near/staking';

<StakingProvider
  network="mainnet"
  getStreamPrices={() => ({
    prices: [100, 200],
    marketCaps: [1000, 2000],
  })}
>
  {/** ... */}
</StakingProvider>
```

The `getStreamPrices` function is responsible for taking a list of CoinGecko
token names (as defined in the `config.ts`) and returning the USD prices and
market caps for each.

Staking functionality can be accessed via the `useStaking` hook.
