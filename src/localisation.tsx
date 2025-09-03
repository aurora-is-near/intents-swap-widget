import i18n from 'i18next';
import { useEffect } from 'react';
import {
  I18nextProvider,
  initReactI18next,
  useTranslation,
} from 'react-i18next';
import type { PropsWithChildren } from 'react';

import type {
  UseTranslationOptions,
  UseTranslationResponse,
} from 'react-i18next';
import type { TFunction } from 'i18next';

type TypedUseTranslationResponse<
  Ns extends string = 'translation',
  KPrefix = undefined,
> = Omit<UseTranslationResponse<Ns, KPrefix>, 't'> & {
  t: (
    key: LocalisationKeys,
    options?: Parameters<TFunction<Ns, KPrefix>>[1],
  ) => string;
};

export function useTypedTranslation<
  Ns extends string = 'translation',
  KPrefix = undefined,
>(
  ns?: Ns | readonly Ns[],
  options?: UseTranslationOptions<KPrefix>,
): TypedUseTranslationResponse<Ns, KPrefix> {
  const { t, ...rest } = useTranslation(
    ns,
    // @ts-expect-error
    options as Parameters<TFunction<Ns, KPrefix>>[1],
  );

  return { t, ...rest } as TypedUseTranslationResponse<Ns, KPrefix>;
}

type LocalisationDict = Partial<Record<LocalisationKeys, string>>;

export const initLocalisation = (dict: LocalisationDict) => {
  return i18n.use(initReactI18next).init({
    resources: {
      en: {
        translation: dict,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
};

export const LocalisationProvider = ({
  localisation,
  children,
}: PropsWithChildren<{ localisation: LocalisationDict }>) => {
  useEffect(() => {
    void initLocalisation(localisation);
  }, []);

  useEffect(() => {
    void i18n.changeLanguage('en');
  }, [localisation]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export type LocalisationKeys =
  // chain
  | 'chain.all.label'
  // wallet
  | 'wallet.recipient.placeholder'
  | 'wallet.recipient.info.selectToken'
  | 'wallet.recipient.error.noAddress'
  | 'wallet.recipient.error.tokenNotSelected'
  | 'wallet.recipient.error.invalidAddress'
  | 'wallet.recipient.warn.compatibleNetwork'
  | 'wallet.recipient.message.networkVerified'
  | 'wallet.recipient.message.receiveFunds'
  | 'wallet.connected.error.notSupportedChain'
  // transfer
  | 'transfer.success.hash.label'
  | 'transfer.success.intent.label'
  // quote
  | 'quote.result.maxSlippage.label'
  | 'quote.result.processingTime.label'
  // tokens
  | 'tokens.input.max.label'
  | 'tokens.input.half.label'
  | 'tokens.input.externalBalance.label'
  | 'tokens.list.noBalanceOnApp.label'
  | 'tokens.list.searchEmpty.label'
  | 'tokens.list.searchReset.label'
  // deposit
  | 'deposit.external.error.noStatus'
  | 'deposit.external.error.incomplete'
  | 'deposit.external.error.failed'
  | 'deposit.external.loading.waiting'
  | 'deposit.external.loading.fetching'
  // submit - errors
  | 'submit.error.insufficientBalance'
  | 'submit.error.invalidAddress'
  | 'submit.error.amountTooLow.label'
  | 'submit.error.amountTooLow.message'
  | 'submit.error.quoteFailed.label'
  | 'submit.error.quoteFailed.message'
  | 'submit.error.transfer.noFees'
  | 'submit.error.transfer.failed'
  // submit - active
  | 'submit.active.transfer'
  | 'submit.active.internal'
  | 'submit.active.external'
  // submit - disabled
  | 'submit.disabled.temporary.label'
  | 'submit.disabled.temporary.message'
  // submit - pending
  | 'submit.pending.quote.finalizing'
  | 'submit.pending.transfer.confirmInWallet'
  | 'submit.pending.transfer.finalizing';
