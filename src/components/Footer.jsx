import React from 'react';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  // Hide footer completely on auth and onboarding pages for a pristine mobile shell experience
  if (location.pathname === '/auth' || location.pathname === '/onboarding') {
    return null;
  }

  return (
    <footer className="mt-8 border-t border-slate-200/60 bg-transparent py-6 text-center text-xs text-slate-500 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-campus">
          <span className="font-extrabold text-[#08795d]">Campus</span>
          <span className="font-extrabold text-[#d48431]">Food</span>
          <span className="text-slate-400 ml-1">• University Meal Service</span>
        </div>
        <p className="text-slate-400">
          &copy; {new Date().getFullYear()} CampusFood. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
