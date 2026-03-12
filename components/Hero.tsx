
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import RegistrationBadge from './RegistrationBadge.tsx';

interface Props {
  onApply: () => void;
}

const Hero: React.FC<Props> = ({ onApply }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section ref={containerRef} className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-12 lg:py-20 overflow-hidden border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <motion.div style={{ y: backgroundY }} className="absolute top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-l from-pakistan-green to-transparent"></div>
      </motion.div>
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-lemon text-pakistan-green dark:text-green-400 tracking-[0.2em]">Enrollment Currently Open</span>
            </div>
            
            <h1 className="hero-title text-5xl md:text-7xl lg:text-8xl mb-6">
              YOUR FIRST <br />
              <span className="text-pakistan-green dark:text-green-500">NOBEL</span> STEP.
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl font-medium tracking-tight">
              Empowering Pakistan's Entrepreneurs, Students, and Job Professionals. Official membership of First Nobel Step (Pvt.) Ltd. is your gateway to global opportunities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 items-center justify-center lg:justify-start">
              <button 
                onClick={onApply}
                className="w-full sm:w-auto bg-pakistan-green text-white px-12 py-5 rounded-2xl font-lemon text-lg text-center hover:bg-green-900 hover:scale-[1.02] transition-all shadow-[0_20px_50px_-15px_rgba(1,65,28,0.5)] flex items-center justify-center gap-3 group active:scale-95"
              >
                Apply Now <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
              
              <div className="flex items-center gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <i className="fa-solid fa-certificate text-pakistan-green dark:text-green-500 text-2xl"></i>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-lemon tracking-[0.2em] text-gray-400">Official Status</span>
                  <span className="text-sm font-extrabold text-pakistan-green dark:text-green-400 font-display">Govt. Registered (Pvt.) Ltd.</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 flex justify-center lg:justify-start gap-12 opacity-30 dark:opacity-50 grayscale hover:grayscale-0 transition-all duration-700 text-gray-900 dark:text-white">
              <div className="flex items-center gap-2.5 font-lemon text-[9px] tracking-[0.3em]">
                <i className="fa-solid fa-shield-halved text-xl"></i> Secure
              </div>
              <div className="flex items-center gap-2.5 font-lemon text-[9px] tracking-[0.3em]">
                <i className="fa-solid fa-earth-americas text-xl"></i> Global
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 hidden lg:block scale-110">
            <RegistrationBadge />
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-pakistan-green to-transparent opacity-20"></div>
    </section>
  );
};

export default Hero;
