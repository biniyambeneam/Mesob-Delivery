import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-8 bg-gray-900 text-gray-200 pb-20 md:pb-6 w-full">
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4 flex flex-col items-center text-center space-y-5">
        <nav aria-label="Footer" className="mb-1 flex flex-wrap items-center justify-center gap-6 text-sm md:text-base">
          <a className="hover:text-emerald-400 transition-colors" href="#">About</a>
          <a className="hover:text-emerald-400 transition-colors" href="#">Services</a>
          <a className="hover:text-emerald-400 transition-colors" href="#">Contact</a>
          <a className="hover:text-emerald-400 transition-colors" href="#">FAQ</a>
        </nav>

        <div className="flex items-center justify-center gap-6 text-xl">
          <a className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-[#0A66C2] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-800/50" href="https://www.linkedin.com/in/abenezer-tiruneh-304834375/" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-linkedin-in" aria-hidden="true"></i>
          </a>
          <a className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-500/50" href="https://www.instagram.com/tirunehbiniyam42/" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-instagram" aria-hidden="true"></i>
          </a>
          <a className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-[#229ED9] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-300/50" href="https://t.me/h_aabsy" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-telegram" aria-hidden="true"></i>
          </a>
        </div>

        <p className="text-xs text-gray-400">&copy; 2026 CampusFood, All rights reserved</p>
      </div>
    </footer>
  );
};

export default Footer;
