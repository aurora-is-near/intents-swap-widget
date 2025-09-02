// import i18n from 'i18next';
// import { initReactI18next } from 'react-i18next';

export const initLocalisation = (
  _dict: Partial<Record<LocalisationKeys, string>>,
) => {
  //   void i18n.use(initReactI18next).init({
  //     resources: {
  //       en: {
  //         translation: dict,
  //       },
  //     },
  //     lng: 'en',
  //     fallbackLng: 'en',
  //     interpolation: {
  //       escapeValue: false,
  //     },
  //   });
};

export type LocalisationKeys =
  | 'chain.dropdownAll.label'
  | 'wallet.recipientAddress.placeholder';
