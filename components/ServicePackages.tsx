import React from 'react';

const ServicePackages: React.FC = () => {
  return (
    <section className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-display font-extrabold text-center mb-12 dark:text-white">Service Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Basic Package */}
          <div className="border rounded-3xl p-8 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-xl font-lemon mb-4 text-pakistan-green dark:text-green-400">Basic Package (Free)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Start your journey with professional guidance.</p>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li>✓ Initial Career Advice</li>
              <li>✓ Access to Platform</li>
              <li>✓ Basic Guidance</li>
              <li>✓ Initial Case Understanding</li>
              <li>✓ Opportunity to Present Case</li>
              <li>✓ General Direction</li>
              <li>✓ Basic Support</li>
            </ul>
          </div>
          {/* Standard Package */}
          <div className="border rounded-3xl p-8 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-xl font-lemon mb-4 text-blue-600 dark:text-blue-400">Standard Package (PKR 14,999)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Professional evaluation and structured guidance.</p>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li>✓ Detailed Problem Evaluation</li>
              <li>✓ Discussion with Representative</li>
              <li>✓ Documents Review</li>
              <li>✓ Personalized Advice</li>
              <li>✓ Priority Case Review</li>
              <li>✓ Opportunity & Risk Assessment</li>
              <li>✓ Strategic Suggestions</li>
              <li>✓ Follow-Up Support</li>
              <li>✓ Verified Badge Certificate</li>
            </ul>
          </div>
          {/* Professional Package */}
          <div className="border rounded-3xl p-8 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-xl font-lemon mb-4 text-purple-600 dark:text-purple-400">Professional Package (PKR 24,999)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Premium advisory experience with exclusive opportunities.</p>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li>✓ Priority Consultation</li>
              <li>✓ Comprehensive Case Analysis</li>
              <li>✓ Advanced Document Evaluation</li>
              <li>✓ Dedicated Case Handling</li>
              <li>✓ Customized Strategic Recommendations</li>
              <li>✓ Global Networking Opportunities</li>
              <li>✓ Exclusive Benefits & Financial Support Chance</li>
              <li>✓ Premium Access & Fast-Track</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicePackages;
