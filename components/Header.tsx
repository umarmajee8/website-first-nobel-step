
import React, { useState, useEffect } from 'react';
import Logo from './Logo.tsx';

interface Props {
  onApply: () => void;
}

const Header: React.FC<Props> = ({ onApply }) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="group cursor-pointer">
          <Logo className="h-10" />
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? (
              <i className="fa-solid fa-sun text-base"></i>
            ) : (
              <i className="fa-solid fa-moon text-base"></i>
            )}
          </button>

          <button 
            onClick={onApply}
            className="bg-pakistan-green text-white px-5 py-2 rounded-lg font-lemon text-[10px] tracking-widest hover:bg-green-800 transition-all shadow-[0_10px_20px_-5px_rgba(1,65,28,0.4)] active:scale-95 text-center inline-block"
          >
            Apply Now
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
