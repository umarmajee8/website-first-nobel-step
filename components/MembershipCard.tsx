
import React from 'react';
import { MembershipPlan } from '../types.ts';

interface Props {
  plan: MembershipPlan;
  onApply: () => void;
}

const MembershipCard: React.FC<Props> = ({ plan, onApply }) => {
  const getIcon = () => {
    switch (plan.category) {
      case 'Entrepreneur': return 'fa-rocket';
      case 'Student': return 'fa-graduation-cap';
      case 'Professional': return 'fa-briefcase';
      default: return 'fa-star';
    }
  };

  return (
    <div className={`relative bg-white dark:bg-gray-900 flex flex-col p-6 rounded-3xl border h-full transition-all duration-500 hover:shadow-2xl ${
      plan.isPopular 
        ? 'border-pakistan-green dark:border-green-600 ring-4 ring-green-50 dark:ring-green-900/20 shadow-[0_25px_60px_-15px_rgba(1,65,28,0.3)] lg:scale-105 z-10' 
        : 'border-gray-100 dark:border-gray-700 shadow-sm hover:-translate-y-1'
    }`}>
      {plan.isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-pakistan-green text-white text-[9px] font-lemon px-5 py-1.5 rounded-full tracking-widest shadow-lg whitespace-nowrap">
          Official Professional Choice
        </div>
      )}
      
      <div className="mb-6 text-center sm:text-left">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.isPopular ? 'bg-pakistan-green text-white' : 'bg-green-50 dark:bg-green-900/30 text-pakistan-green dark:text-green-400'}`}>
          <i className={`fa-solid ${getIcon()} text-xl`}></i>
        </div>
        <h3 className="text-lg font-lemon mb-1 tracking-tight dark:text-white transition-colors">{plan.name}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{plan.description}</p>
      </div>
      
      <div className="h-px bg-gray-100 dark:bg-gray-800 w-full mb-6"></div>
      
      <div className="mb-3 text-[10px] font-lemon text-pakistan-green dark:text-green-400 tracking-widest">
        What You Unlock:
      </div>
      
      <ul className="space-y-3 mb-6 flex-grow">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
            <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-50 dark:bg-green-900/40 flex items-center justify-center">
              <i className="fa-solid fa-check text-pakistan-green dark:text-green-400 text-[9px]"></i>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">{feature}</span>
          </li>
        ))}
      </ul>
      
      <button 
        onClick={onApply}
        className="w-full py-3.5 rounded-xl font-lemon text-[10px] tracking-widest transition-all bg-pakistan-green text-white shadow-xl shadow-green-900/10 hover:scale-[1.02] hover:bg-green-900 active:scale-95 uppercase"
      >
        Join {plan.name}
      </button>
    </div>
  );
};

export default MembershipCard;
