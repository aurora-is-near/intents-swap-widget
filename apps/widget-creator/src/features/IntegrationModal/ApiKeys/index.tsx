import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { useCreator } from '@/hooks/useCreatorConfig';
import { useApiKeys, useCreateApiKey, useTosAcceptance } from '@/api/hooks';
import type { ApiKey } from '@/api/types';
import { Header } from '../components';

import { ApiKeyCard } from './ApiKeyCard';
import { ApiKeysEmpty } from './ApiKeysEmpty';
import { ApiKeysNoAuth } from './ApiKeysNoAuth';
import { ApiKeysSkeleton } from './ApiKeysSkeleton';
import { CreateApiKey } from './CreateApiKey';

const ApiKeysHeader = () => (
  <div className="pt-csw-2xl pb-csw-4xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
    <Header
      title="API keys"
      description="Create and manage API keys required to activate the Intents Studio widget. Each API key is linked to a specific fee setup."
      warning="Protocol fees are always applied. Custom fees can be setup optionally."
    />
  </div>
);

type Props = {
  onClickFees: (apiKey: ApiKey) => void;
};

export const ApiKeys = ({ onClickFees }: Props) => {
  const { authenticated } = usePrivy();
  const { dispatch } = useCreator();

  const { status, data: apiKeys = [] } = useApiKeys();
  const { mutate: createApiKey, ...mutation } = useCreateApiKey();
  const { data: tos, isLoading: isTosLoading } = useTosAcceptance();

  const alreadyAccepted = tos?.accepted ?? false;

  useEffect(() => {
    if (mutation.status === 'success') {
      dispatch({
        type: 'SET_API_KEY',
        payload: mutation.data.apiKey,
      });
    }
  }, [mutation.status]);

  if (!authenticated) {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysNoAuth />
      </>
    );
  }

  // Wait for the acceptance status too, so CreateApiKey renders its final state
  // (checkbox vs. footer) directly instead of briefly flashing the checkbox
  // before the ToS read resolves on a fresh load.
  if (status === 'pending' || isTosLoading) {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysSkeleton />
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysEmpty message="Unable to load API keys" />
        <CreateApiKey
          isLoading={mutation.status === 'pending'}
          alreadyAccepted={alreadyAccepted}
          onClick={createApiKey}
        />
      </>
    );
  }

  if (!apiKeys.length) {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysEmpty />
        <CreateApiKey
          isLoading={mutation.status === 'pending'}
          alreadyAccepted={alreadyAccepted}
          onClick={createApiKey}
        />
      </>
    );
  }

  return (
    <>
      <ApiKeysHeader />
      <div className="flex flex-col gap-csw-2xl mt-csw-2xl flex flex-col">
        {apiKeys.map((apiKey) => (
          <ApiKeyCard
            apiKey={apiKey}
            key={apiKey.apiKey}
            onClickFees={onClickFees}
          />
        ))}
      </div>

      <CreateApiKey
        isLoading={mutation.status === 'pending'}
        alreadyAccepted={alreadyAccepted}
        onClick={createApiKey}
      />
    </>
  );
};
