import { usePrivy } from '@privy-io/react-auth';

import { Header } from '../Header';
import { ApiKeysEmpty } from './ApiKeysEmpty';
import { ApiKeysNoAuth } from './ApiKeysNoAuth';
import { ApiKeysSkeleton } from './ApiKeysSkeleton';
import { ApiKeyCard } from './ApiKeyCard';
import { CreateApiKey } from './CreateApiKey';

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

  const { status, data: apiKeys = [] } = useApiKeys();
  const { mutate: createApiKey, status: createApiKeyStatus } =
    useCreateApiKey();

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
          isCreatingKey={createApiKeyStatus === 'pending'}
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
          isCreatingKey={createApiKeyStatus === 'pending'}
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
          />
        ))}
      </div>

      <CreateApiKey
        isLoading={createApiKeyStatus === 'pending'}
        onClick={createApiKey}
      />
    </>
  );
};
