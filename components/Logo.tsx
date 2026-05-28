import React from 'react';

interface Props {
  className?: string;
}

const Logo: React.FC<Props> = ({ className = "h-10" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src="https://lh3.googleusercontent.com/d/17no--1RLs1mzkG2iYfqfcvpWkpKA3c4X" alt="Logo" className="h-full w-auto" referrerPolicy="no-referrer" />
      <div className="flex flex-col">
        <span className="font-lemon text-base tracking-tight leading-none dark:text-white text-gray-900">
          First Noble Step
        </span>
        <span className="text-[9px] font-bold tracking-[0.25em] leading-none mt-1.5 text-[#01411C]">
          (PRIVATE) LIMITED
        </span>
      </div>
    </div>
  );
};

export default Logo;
