
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
  return (
    <section id="membership" className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-300 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-block px-5 py-2 bg-green-100 dark:bg-green-900/30 text-pakistan-green dark:text-green-400 rounded-full text-[9px] font-lemon tracking-[0.3em] mb-4">
            Unlock Your Potential
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-extrabold mb-6 tracking-tight dark:text-white">Official Membership Programs</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg font-medium leading-relaxed tracking-tight">
            Legally structured pathways for your global career and business success. Choose the path that matches your ambition.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <MembershipCard key={plan.id} plan={plan} onApply={() => onApply(plan.id)} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MembershipSection;
