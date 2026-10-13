import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../lib/translations.js';

const LanguageContext = createContext(null);
const LANGUAGE_STORAGE_KEY = 'campusfood-language';

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === 'am' ? 'am' : 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === 'am' ? 'am' : 'en';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((currentLanguage) => (currentLanguage === 'en' ? 'am' : 'en'));
  };

  const value = useMemo(
    () => ({
      language,
      toggleLanguage,
      t: translations[language] ?? translations.en,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }

  return context;
}
