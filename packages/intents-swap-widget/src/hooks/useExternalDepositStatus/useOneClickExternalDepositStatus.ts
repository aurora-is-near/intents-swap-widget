import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';

type Args = {
  depositAddress: string;
};

export const useOneClickExternalDepositStatus = ({ depositAddress }: Args) => {
  const pollDepositStatus = async () => {
    return OneClickService.getExecutionStatus(depositAddress);
  };

  return { pollDepositStatus };
};
