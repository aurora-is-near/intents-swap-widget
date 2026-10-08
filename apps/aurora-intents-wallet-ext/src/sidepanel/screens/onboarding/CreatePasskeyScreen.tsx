import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  Banner,
  Button,
  Input,
  verifyPasskey,
} from '@aurora-is-near/intents-swap-widget';
import { getWebAuthnIntentsAccountId } from '@aurora-is-near/intents-swap-widget/utils';

import { nextAccountName, useAccounts } from '../../accounts/useAccounts';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { useNavigation } from '../../navigation';
import {
  createPasskey,
  createWebAuthnProvider,
  PasskeyError,
} from '../../passkey/webauthn';

type Step =
  | { name: 'form' }
  | { name: 'creating' }
  | { name: 'verifying' }
  | { name: 'failed'; message: string };

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'key',
    title: 'No seed phrase',
    description: 'Your passkey is stored by your browser or password manager.',
  },
  {
    icon: 'shield',
    title: 'Confirm with Touch ID or Windows Hello',
    description: 'Every swap and send is approved with your device lock.',
  },
  {
    icon: 'phone',
    title: 'Synced across devices',
    description:
      'Use the same passkey on any device signed in to your account.',
  },
];

const describeError = (error: unknown) => {
  if (error instanceof PasskeyError) {
    return error.message;
  }

  return error instanceof Error ? error.message : 'Unknown error';
};

const Form = ({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
}) => (
  <>
    <div className="flex flex-col gap-sw-lg pt-sw-lg">
      <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-sw-lg bg-sw-accent-500 text-sw-gray-950">
        <Icon name="key" size={28} />
      </div>
      <h2 className="m-0 text-sw-h5 text-sw-gray-50">
        Secure your account with a passkey
      </h2>
      <p className="m-0 text-sw-body-md text-sw-gray-200">
        A passkey replaces passwords and seed phrases. It never leaves your
        device.
      </p>
    </div>
    <ul className="m-0 flex list-none flex-col gap-sw-2xl rounded-sw-lg bg-sw-gray-900 p-sw-2xl">
      {FEATURES.map((feature) => (
        <li key={feature.title} className="flex items-start gap-sw-lg">
          <span className="mt-[1px] text-sw-accent-300">
            <Icon name={feature.icon} />
          </span>
          <div className="flex flex-col gap-sw-xs">
            <span className="text-sw-label-md text-sw-gray-50">
              {feature.title}
            </span>
            <span className="text-sw-body-sm text-sw-gray-300">
              {feature.description}
            </span>
          </div>
        </li>
      ))}
    </ul>
    <label className="flex flex-col gap-sw-md">
      <span className="text-sw-label-sm text-sw-gray-200">Account name</span>
      <Input
        defaultValue={name}
        placeholder="Account name"
        maxLength={32}
        onChange={(event) => onNameChange(event.target.value)}
      />
    </label>
  </>
);

/**
 * Creates the passkey, then has it sign an empty intent that intents.near
 * simulates. The account is only saved once the contract accepts the
 * signature, so a passkey that can't sign never gets funds deposited to it.
 */
export const CreatePasskeyScreen = () => {
  const { accounts, add } = useAccounts();
  const { back, reset } = useNavigation();
  const [name, setName] = useState(() => nextAccountName(accounts));
  const [step, setStep] = useState<Step>({ name: 'form' });

  const accountName = name.trim() || nextAccountName(accounts);

  const create = async () => {
    try {
      setStep({ name: 'creating' });
      const passkey = await createPasskey(accountName);

      setStep({ name: 'verifying' });
      const isValid = await verifyPasskey(createWebAuthnProvider(passkey));

      if (!isValid) {
        throw new Error(
          'NEAR Intents did not accept this passkey’s signature.',
        );
      }

      const id = crypto.randomUUID();

      await add({
        kind: 'passkey',
        id,
        name: accountName,
        ...passkey,
        intentsAccountId: getWebAuthnIntentsAccountId(passkey.publicKey),
        createdAt: Date.now(),
      });

      reset({ name: 'passkeyCreated', accountId: id });
    } catch (error) {
      setStep({ name: 'failed', message: describeError(error) });
    }
  };

  let content: ReactNode;
  let footer: ReactNode;

  switch (step.name) {
    case 'form':
      content = <Form name={name} onNameChange={setName} />;
      footer = (
        <Button variant="primary" size="lg" onClick={create}>
          Create passkey
        </Button>
      );
      break;

    case 'creating':
    case 'verifying':
      content = (
        <>
          <StatusHero
            tone="pending"
            title={
              step.name === 'creating'
                ? 'Confirm in your browser'
                : 'Confirm your passkey'
            }
            description={
              step.name === 'creating'
                ? 'Follow the prompt from Chrome to save your passkey. This can take a few seconds.'
                : 'Use your passkey once more so we can check that NEAR Intents accepts it. Nothing is sent.'
            }
          />
          <Banner
            variant="info"
            message="Keep this panel open until the passkey is saved."
            hasBg
            multiline
          />
        </>
      );
      footer = (
        <Button variant="primary" size="lg" state="loading">
          Waiting for passkey
        </Button>
      );
      break;

    case 'failed':
      content = (
        <>
          <StatusHero
            tone="error"
            title="Passkey wasn’t created"
            description="The request was cancelled or timed out. Nothing was saved and no account was created."
          />
          <Banner variant="error" message={step.message} hasBg multiline />
        </>
      );
      footer = (
        <>
          <Button variant="primary" size="lg" onClick={create}>
            Try again
          </Button>
          <Button variant="outlined" size="lg" onClick={back}>
            Back to start
          </Button>
        </>
      );
      break;

    default:
      footer = null;
  }

  return (
    <Screen
      title="Create account"
      // Leaving mid-prompt would orphan the passkey being saved.
      onBack={
        step.name === 'creating' || step.name === 'verifying' ? undefined : back
      }
      footer={footer}>
      {content}
    </Screen>
  );
};
