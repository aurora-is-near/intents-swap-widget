import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';

type Args = {
  depositAddress: string;
};

export const useOneClickExternalDepositStatus = ({ depositAddress }: Args) => {
  const pollDepositStatus = async () => {
    const result = await OneClickService.getExecutionStatus(depositAddress);

    return {
      ...result,
      swapDetails: {
        ...result.swapDetails,
        amount: result.quoteResponse.quote.amountIn,
      },
    };
  };

  return { pollDepositStatus };
};
