
import React from 'react';

interface Props {
  className?: string;
  variant?: 'light' | 'dark' | 'color';
}

const Logo: React.FC<Props> = ({ className = "h-8", variant = 'color' }) => {
  const getFill = () => {
    if (variant === 'light') return '#FFFFFF';
    if (variant === 'dark') return '#000000';
    return '#01411C'; // Pakistan Green
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Optimized viewBox to focus on the paths and prevent clipping */}
      <svg viewBox="15 20 70 100" className="h-full w-auto drop-shadow-sm">
        <g fill={getFill()}>
          <path d="
            M31,21.5 
            h27 
            v14.5 
            c0,0 -12.5,1.5 -12.8,24.5 
            c-0.2,15.5 -10.5,31.5 -17.5,36.5 
            c-7,5 -16,1 -16,-5.5 
            c0-5.5,5-8,9.5-11 
            c4-2.5,10-11,10-23.5 
            c0-13.5,0.3-22.5,0.3-22.5 
            z" 
          />
          <path d="
            M53.5,58.5 
            c0,0,3.8,12,3.8,24 
            c0,10.5,0,17.5,10.5,20.5 
            c9.5,3,17-2.5,17-8 
            c0-3-3.5-6-8.5-7.5 
            c-4.5-1.5-9.5-6-11.5-13 
            c-2-7-4.5-16-4.5-16 
            z" 
          />
          {/* Subtle Shadow closer to the base */}
          <ellipse cx="50" cy="112" rx="12" ry="3" opacity="0.1" />
        </g>
      </svg>
      <div className="flex flex-col">
        <span className={`font-lemon text-base tracking-tight leading-none ${variant === 'light' ? 'text-white' : 'dark:text-white text-gray-900'}`}>
          First Nobel Step
        </span>
        <span className={`text-[9px] font-bold tracking-[0.25em] leading-none mt-1.5 ${variant === 'light' ? 'text-white/80' : 'text-pakistan-green'}`}>
          (PRIVATE) LIMITED
        </span>
      </div>
    </div>
  );
};

export default Logo;
