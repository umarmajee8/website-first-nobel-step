
import React, { useState } from 'react';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import MembershipSection from './components/MembershipSection.tsx';
import Footer from './components/Footer.tsx';
import MembershipForm from './components/MembershipForm.tsx';

const App: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const openForm = (planId?: string) => {
    if (planId) {
      setSelectedPlanId(planId);
    } else {
      setSelectedPlanId(null);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedPlanId(null);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-green-100 selection:text-pakistan-green bg-white transition-colors duration-300">
      <Header onApply={() => openForm()} />
      <main className="flex-grow">
        <Hero onApply={() => openForm()} />
        <MembershipSection onApply={(id) => openForm(id)} />
      </main>
      
      {/* AI Chat Assistant removed to eliminate API key dependency */}
      
      <Footer onApply={() => openForm()} />

      {isFormOpen && (
        <MembershipForm 
          initialPlanId={selectedPlanId} 
          onClose={closeForm} 
        />
      )}
    </div>
  );
};

export default App;
