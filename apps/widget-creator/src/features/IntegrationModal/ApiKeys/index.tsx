import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { Header } from '../components';

import { ApiKeyCard } from './ApiKeyCard';
import { ApiKeysEmpty } from './ApiKeysEmpty';
import { ApiKeysNoAuth } from './ApiKeysNoAuth';
import { ApiKeysSkeleton } from './ApiKeysSkeleton';
import { CreateApiKey } from './CreateApiKey';

import { DEFAULT_APP_KEY } from '@/constants';
import { useCreator } from '@/hooks/useCreatorConfig';
import { useApiKeys, useCreateApiKey } from '@/api/hooks';
import type { ApiKey } from '@/api/types';

const ApiKeysHeader = () => (
  <div className="px-csw-2xl pt-csw-2xl pb-csw-4xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
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

  const handleKeyRemoved = (appKey: string) => {
    const newApiKeys = apiKeys.filter(
      (apiKey) => apiKey.widgetAppKey !== appKey,
    );

    dispatch({
      type: 'SET_APP_KEY',
      payload: newApiKeys[0]?.widgetAppKey ?? DEFAULT_APP_KEY,
    });
  };

  useEffect(() => {
    if (mutation.status === 'success') {
      dispatch({
        type: 'SET_APP_KEY',
        payload: mutation.data.widgetAppKey,
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

  if (status === 'pending') {
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
        <ApiKeysEmpty
          message="Unable to load API keys"
          isCreatingKey={mutation.status === 'pending'}
          onClickCreate={createApiKey}
        />
      </>
    );
  }

  if (!apiKeys.length) {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysEmpty
          isCreatingKey={mutation.status === 'pending'}
          onClickCreate={createApiKey}
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
            key={apiKey.widgetAppKey}
            onClickFees={onClickFees}
            onKeyRemoved={handleKeyRemoved}
          />
        ))}
      </div>

      <CreateApiKey
        isLoading={mutation.status === 'pending'}
        onClick={createApiKey}
      />
    </>
  );
};
