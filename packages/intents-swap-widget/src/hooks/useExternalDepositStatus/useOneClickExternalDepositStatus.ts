import {
  GetExecutionStatusResponse,
  OneClickService,
} from '@defuse-protocol/one-click-sdk-typescript';

type Args = {
  depositAddress: string;
};

let counter = 0;

export const useOneClickExternalDepositStatus = ({ depositAddress }: Args) => {
  const pollDepositStatus = async () => {
    counter += 1;

    if (counter > 3) {
      return {
        updatedAt: '2025-12-11T13:05:42.924Z',
        status: GetExecutionStatusResponse.status.INCOMPLETE_DEPOSIT,
        swapDetails: {
          intentHashes: [],
          nearTxHashes: [],
          originChainTxHashes: [],
          destinationChainTxHashes: [],
        },
        quoteResponse: {
          amountIn: '100000',
          amountInFormatted: '0.001',
          amountInUsd: '0.0842',
          minAmountIn: '100000',
          amountOut: '84255',
          amountOutFormatted: '0.084255',
          amountOutUsd: '0.0842',
          minAmountOut: '83412',
          timeEstimate: 125,
          deadline: '2025-12-11T13:05:42.924Z',
          timeWhenInactive: '2025-12-11T13:05:42.924Z',
          depositAddress: 'LcgEc9pNJSXkfkYFPNe6jQHs2yAg53qfKs',
        },
      };
    }

    return OneClickService.getExecutionStatus(depositAddress);
  };

  return { pollDepositStatus };
};
