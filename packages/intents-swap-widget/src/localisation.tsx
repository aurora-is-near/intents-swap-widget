import i18n, { type TFunction } from 'i18next';
import {
  initReactI18next,
  useTranslation,
  type UseTranslationOptions,
  type UseTranslationResponse,
} from 'react-i18next';

import { LocalisationDict, LocalisationKeys } from './types/localisation';

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

export const initLocalisation = (dict: LocalisationDict = {}) => {
  void i18n.use(initReactI18next).init({
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
