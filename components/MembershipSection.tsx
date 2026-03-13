import React from 'react';
import MembershipCard from './MembershipCard.tsx';
import { MembershipPlan } from '../types.ts';

const plans: MembershipPlan[] = [
  {
    id: 'professional',
    name: 'Job Professionals',
    category: 'Professional',
    description: 'Direct access to fully sponsored international career opportunities.',
    features: [
      'Direct access to sponsored foreign jobs',
      'Overseas opportunities with borne expenses',
      'Verified job placements in top economies',
      'Legal, structured placement process',
      'Access to exclusive recruiter opportunities'
    ],
    isPopular: true
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneurs',
    category: 'Entrepreneur',
    description: 'Transform your vision into a funded reality with expert mentorship.',
    features: [
      'Turn your idea into funded reality',
      'Strategic feedback from business leaders',
      'Official Membership of First Nobel Step (Pvt.) Ltd.',
      'Verified Business Opportunity Alerts',
      'Powerful Business Networking'
    ]
  },
  {
    id: 'student',
    name: 'Official Student',
    category: 'Student',
    description: 'Academic excellence and professional growth pathways for future leaders.',
    features: [
      'Full academic scholarship until graduation',
      'Earn while learning professionally',
      'Paid internships via verified partners',
      'Direct exposure to real business projects',
      'Skill-based income opportunities'
    ]
  }
];

interface Props {
  onApply: (planId: string) => void;
}

const MembershipSection: React.FC<Props> = ({ onApply }) => {
  const professionalPlans = plans.filter(p => p.category === 'Professional');
  const studentPlans = plans.filter(p => p.category === 'Student');
  const entrepreneurPlans = plans.filter(p => p.category === 'Entrepreneur');

  return (
    <section id="membership" className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-300 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-extrabold mb-6 tracking-tight dark:text-white">Students & Professionals</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg font-medium leading-relaxed tracking-tight">
            Whether you're a student seeking excellence or a professional looking for global growth, we have a pathway for you.
          </p>
        </div>
        
        <div className="space-y-8">
          {[...professionalPlans, ...studentPlans].map((plan) => (
            <div key={plan.id} className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 text-pakistan-green dark:text-green-400 rounded-2xl flex items-center justify-center">
                  <i className={`fa-solid ${plan.category === 'Professional' ? 'fa-briefcase' : 'fa-graduation-cap'} text-2xl`}></i>
                </div>
                <h3 className="text-xl font-lemon uppercase tracking-widest dark:text-white">{plan.name}</h3>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.slice(0, 2).map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <i className="fa-solid fa-check text-pakistan-green dark:text-green-400"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => onApply(plan.id)}
                className="w-full py-4 rounded-2xl font-lemon text-xs tracking-widest bg-pakistan-green text-white hover:bg-green-900 transition-all uppercase"
              >
                Join {plan.category === 'Professional' ? 'Professionals' : 'Students'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20">
          <h3 className="text-2xl font-display font-bold mb-10 text-gray-900 dark:text-white text-center">Entrepreneurs</h3>
          <div className="grid grid-cols-1 gap-8 items-stretch justify-items-center">
            {entrepreneurPlans.map((plan) => (
              <MembershipCard key={plan.id} plan={plan} onApply={() => onApply(plan.id)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MembershipSection;
