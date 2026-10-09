import {
  Badge,
  BlockingError,
  Button,
  CopyButton,
  Notes,
  useTokens,
} from '@aurora-is-near/intents-swap-widget';

import { ActivityStatusBadge } from '../../activity/ActivityCard';
import { appName, toAppActivityItem } from '../../activity/appActivity';
import { STATUS_COPIES } from '../../apps/polymarket/copies';
import { useAppExecutions } from '../../apps/useAppExecutions';
import { AppMark } from '../../components/AppMark';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { TokenWithChain } from '../../components/TokenWithChain';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { DepositSteps, stepStates } from '../apps/DepositSteps';
import { chainLabel } from '../transfer/summary';
import { NotesCard } from '../transfer/TransferStatus';

const formatCreated = (date: Date) =>
  date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const Copyable = ({ value }: { value: string }) => (
  <span className="flex items-center gap-sw-sm">
    {shortAddress(value)}
    <CopyButton value={value} />
  </span>
);

/** Which of the deposit's stages it reached, from its status. */
const progressOf = (status: string) => {
  switch (status) {
    case 'CREATED':
      return 0;
    case 'DEPOSIT_PENDING':
    case 'DEPOSIT_PROCESSING':
    case 'EXPIRED':
    case 'DEPOSIT_FAILED':
      return 1;
    case 'OPERATION_PENDING':
      return 2;
    case 'OPERATION_PROCESSING':
    case 'OPERATION_FAILED':
      return 3;
    default:
      return 4;
  }
};

/** One app deposit: amounts, progress and where it went. */
export const AppExecutionScreen = ({
  executionId,
}: {
  executionId: string;
}) => {
  const { back } = useNavigation();
  const { tokens } = useTokens();
  const { executions, isLoading, isError, refetch } = useAppExecutions();
  const execution = executions.find((item) => item.id === executionId);

  if (!execution) {
    return (
      <Screen title="Deposit details" onBack={back}>
        {isLoading ? null : (
          <BlockingError
            message={
              isError
                ? 'Couldn’t load this deposit.'
                : 'This deposit is no longer listed.'
            }
            onClickRetry={() => {
              refetch().catch(() => undefined);
            }}
          />
        )}
      </Screen>
    );
  }

  const item = toAppActivityItem(tokens, execution);
  const name = appName(item);
  const { token } = item.from;
  // The swap step pays the app account directly (its tuple's 4th field).
  const appAccount = (() => {
    const swap = execution.steps.find(
      (step) =>
        'functionSignature' in step &&
        step.functionSignature.startsWith('exactInputSingle'),
    );

    const params =
      swap && 'parameters' in swap ? (swap.parameters[0] as unknown) : null;

    return Array.isArray(params) && typeof params[3] === 'string'
      ? params[3]
      : undefined;
  })();

  const isFailed = item.status === 'failed';
  const progress = progressOf(execution.status);
  const evmTx = execution.transaction?.evmTxHash;

  return (
    <Screen
      title="Deposit details"
      onBack={back}
      footer={
        <>
          {item.app ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                void chrome.tabs.create({ url: item.app?.homeUrl });
              }}>
              Open {name}
            </Button>
          ) : null}
          {evmTx ? (
            <Button
              variant="outlined"
              size="lg"
              onClick={() => {
                void chrome.tabs.create({
                  url: `https://polygonscan.com/tx/${evmTx}`,
                });
              }}>
              View transaction
            </Button>
          ) : null}
        </>
      }>
      <div className="flex shrink-0 flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-2xl">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-sw-sm text-sw-label-md text-sw-gray-200">
            Deposit
            <Badge className="ml-[0px]">{name}</Badge>
          </span>
          <ActivityStatusBadge status={item.status} />
        </div>
        <div className="mt-sw-md flex flex-col gap-sw-md">
          <div className="flex items-center gap-sw-lg">
            {token ? <TokenWithChain token={token} /> : null}
            <div className="flex min-w-[0px] flex-col gap-sw-xs">
              <span className="truncate text-sw-h5 text-sw-gray-50">
                {item.from.amount || '—'} {token?.symbol ?? ''}
              </span>
              {token ? (
                <span className="text-sw-label-sm text-sw-gray-300">
                  from your wallet on {chainLabel(token.blockchain)}
                </span>
              ) : null}
            </div>
          </div>
          <span className="flex w-[40px] justify-center text-sw-gray-400">
            <Icon name="arrowDown" size={18} />
          </span>
          <div className="flex items-center gap-sw-lg">
            {item.app ? <AppMark app={item.app} /> : null}
            <div className="flex min-w-[0px] flex-col gap-sw-xs">
              <span className="truncate text-sw-h5 text-sw-gray-50">
                {item.status === 'success' ? '' : '≈ '}
                {item.to.amount || '—'} {item.to.symbol}
              </span>
              <span className="text-sw-label-sm text-sw-gray-300">
                to {name}
                {appAccount ? ` ${shortAddress(appAccount)}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DepositSteps
        steps={stepStates(
          [
            'Signed',
            'Deposit received',
            `Bridged to ${chainLabel(item.app?.chain ?? 'pol')}`,
            `Swapped to ${item.to.symbol} and credited`,
          ],
          progress,
          isFailed,
        )}
      />

      <NotesCard>
        <Notes.Item label="Status" value={STATUS_COPIES[execution.status]} />
        {item.fee ? (
          <Notes.Item label="Fees" value={`${item.fee} USDC`} />
        ) : null}
        {token && item.app ? (
          <Notes.Item
            label="Route"
            value={`${token.symbol} ${chainLabel(token.blockchain)} → ${chainLabel(item.app.chain)} → ${item.to.symbol}`}
          />
        ) : null}
        {execution.details.intermediaryAddress ? (
          <Notes.Item
            label="Intents Connect account"
            value={<Copyable value={execution.details.intermediaryAddress} />}
          />
        ) : null}
        {execution.quote.depositAddress ? (
          <Notes.Item
            label="Deposit address"
            value={<Copyable value={execution.quote.depositAddress} />}
          />
        ) : null}
        <Notes.Item
          label="Execution"
          value={<Copyable value={execution.id} />}
        />
        <Notes.Item label="Created" value={formatCreated(item.createdAt)} />
      </NotesCard>
    </Screen>
  );
};
