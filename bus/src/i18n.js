// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import translationEN from './locales/en.json';
import translationFR from './locales/fr.json';

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // Fallback if a translation is missing
    debug: true,
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
