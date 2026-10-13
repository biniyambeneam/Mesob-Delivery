import { useLanguage } from '../context/LanguageContext.jsx';

export default function LanguageToggle({ className = '' }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 border-none bg-transparent px-2 py-1 text-sm font-bold text-emerald-700 shadow-none transition-colors hover:text-emerald-800 md:rounded-full md:border md:border-gray-200 md:bg-white md:px-4 md:py-2 md:font-medium md:text-slate-700 md:shadow-sm md:hover:bg-gray-50 ${className}`.trim()}
      onClick={toggleLanguage}
      aria-label={`Switch language. Current language is ${language === 'en' ? 'English' : 'Amharic'}.`}
    >
      <span className={language === 'en' ? 'text-emerald-700 md:text-emerald-700' : 'text-slate-400 md:text-slate-500'}>EN</span>
      <span className="text-slate-300 md:text-slate-400">/</span>
      <span className={language === 'am' ? 'text-emerald-700 md:text-emerald-700' : 'text-slate-400 md:text-slate-500'}>አማ</span>
    </button>
  );
}
