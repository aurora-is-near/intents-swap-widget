import { usePrivy } from '@privy-io/react-auth';

import { Header } from '../components';
import { ApiKeysEmpty } from '../ApiKeys/ApiKeysEmpty';
import { ApiKeysNoAuth } from '../ApiKeys/ApiKeysNoAuth';
import { ApiKeysSkeleton } from '../ApiKeys/ApiKeysSkeleton';

import { GotoApiKeys } from './GotoApiKeys';
import { ReportForm } from './ReportForm';

import { useApiKeys } from '@/api/hooks';
import { useCreator } from '@/hooks/useCreatorConfig';

const ReportHeader = () => (
  <div className="px-csw-2xl pt-csw-2xl pb-csw-4xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
    <Header
      title="Reports"
      description="Download a CSV report of all transactions for the selected widget configuration within your chosen date range."
    />
  </div>
);

type Props = {
  onClickApiKeys: () => void;
};

export const Report = ({ onClickApiKeys }: Props) => {
  const { authenticated } = usePrivy();
  const { status, data: apiKeys = [] } = useApiKeys();
  const { state } = useCreator();

  if (!authenticated) {
    return (
      <>
        <ReportHeader />
        <ApiKeysNoAuth message="Log in to view your API keys and generate reports" />
      </>
    );
  }

  if (status === 'pending') {
    return (
      <>
        <ReportHeader />
        <ApiKeysSkeleton />
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <ReportHeader />
        <ApiKeysEmpty message="Unable to load API keys" />
        <GotoApiKeys onClick={onClickApiKeys} />
      </>
    );
  }

  if (!apiKeys.length) {
    return (
      <>
        <ReportHeader />
        <ApiKeysEmpty message="No API keys available to generate reports" />
        <GotoApiKeys onClick={onClickApiKeys} />
      </>
    );
  }

  const selectedKey = apiKeys.find(
    (apiKey) => apiKey.widgetApiKey === state.apiKey,
  );

  const widgetAppKey = selectedKey?.widgetApiKey ?? apiKeys[0]?.widgetApiKey;

  if (!widgetAppKey) {
    return (
      <>
        <ReportHeader />
        <ApiKeysEmpty message="No API keys available to generate reports" />
        <GotoApiKeys onClick={onClickApiKeys} />
      </>
    );
  }

  return (
    <>
      <ReportHeader />
      <ReportForm widgetAppKey={widgetAppKey} />
    </>
  );
};
