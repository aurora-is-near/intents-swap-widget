import { usePrivy } from '@privy-io/react-auth';

import { Header } from '../Header';
import { ApiKeysEmpty } from './ApiKeysEmpty';
import { ApiKeysNoAuth } from './ApiKeysNoAuth';
import { ApiKeyCard } from './ApiKeyCard';

const ApiKeysHeader = () => (
  <div className="px-csw-2xl pt-csw-2xl pb-csw-4xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
    <Header
      title="API keys"
      description="Create and manage API keys required to activate the Intents Studio widget. Each API key is linked to a specific fee setup."
      warning="Protocol fees are always applied. Custom fees can be setup optionally."
    />
  </div>
);

const apiKeys = [];

type Props = {
  onClickFees: (apiKey: string) => void;
};

export const ApiKeys = ({ onClickFees }: Props) => {
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysNoAuth />
      </>
    );
  }

  if (!apiKeys.length) {
    return (
      <>
        <ApiKeysHeader />
        <ApiKeysEmpty />
      </>
    );
  }

  return (
    <>
      <ApiKeysHeader />
      <div className="flex flex-col gap-csw-2xl mt-csw-2xl flex flex-col">
        <ApiKeyCard
          createdAt="2024-01-01"
          apiKey="sk-asdsafh29235kjlskf235pfd1"
          onClickFees={onClickFees}
        />
      </div>
    </>
  );
};
