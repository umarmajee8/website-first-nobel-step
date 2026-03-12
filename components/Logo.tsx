import React from 'react';

interface Props {
  className?: string;
}

const Logo: React.FC<Props> = ({ className = "h-10" }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex flex-col">
        <span className="font-lemon text-base tracking-tight leading-none dark:text-white text-gray-900">
          First Nobel Step
        </span>
        <span className="text-[9px] font-bold tracking-[0.25em] leading-none mt-1.5 text-pakistan-green">
          (PRIVATE) LIMITED
        </span>
      </div>
    </div>
  );
};

export default Logo;
