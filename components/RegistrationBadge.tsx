import React from 'react';

const RegistrationBadge: React.FC = () => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Outer Rotating Text */}
      <svg className="absolute w-full h-full animate-spin-slow" viewBox="0 0 200 200">
        <defs>
          <path id="badgeCirclePath" d="M 100, 100 m -80, 0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0" />
        </defs>
        <text className="text-[10px] font-black fill-pakistan-green dark:fill-green-500 opacity-40 uppercase tracking-[4px]">
          <textPath href="#badgeCirclePath" startOffset="0%">
            Government of Pakistan • Official Registration • Verified •
          </textPath>
        </text>
      </svg>
      
      {/* Subtle Rotating Ring */}
      <div className="absolute w-[150px] h-[150px] border border-dashed border-pakistan-green/20 dark:border-green-500/20 rounded-full animate-slow-rotate"></div>
      
      {/* Central Shield/Seal */}
      <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center border-4 border-pakistan-green dark:border-green-600 relative z-10 seal-animation shadow-[0_20px_50px_rgba(1,65,28,0.3)] overflow-hidden">
        <div className="p-4 flex flex-col items-center">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/e/ef/State_emblem_of_Pakistan.svg" 
            alt="Government of Pakistan Logo" 
            className="w-16 h-16 object-contain mb-1 filter drop-shadow-sm"
          />
          <div className="text-[8px] font-black text-center leading-none tracking-tighter text-pakistan-green dark:text-green-400 uppercase">
            Govt. of Pakistan <br /> (Pvt.) Ltd.
          </div>
        </div>
      </div>
      
      {/* Pulsing Glow */}
      <div className="absolute inset-0 bg-green-500/10 blur-[40px] -z-10 rounded-full animate-pulse"></div>
    </div>
  );
};

export default RegistrationBadge;