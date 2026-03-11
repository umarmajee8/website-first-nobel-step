
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormStep, MembershipApplication } from '../types.ts';

interface Props {
  initialPlanId: string | null;
  onClose: () => void;
}

const STORAGE_KEY = 'fms_membership_progress';

// Helper Component: Official Govt Seal
const OfficialSeal = ({ className = "", color = "text-pakistan-green" }: { className?: string, color?: string }) => (
  <div className={`relative flex items-center justify-center select-none ${className} ${color}`} title="Government Registered Entity">
    <div className="absolute inset-0 border border-dashed border-current opacity-40 rounded-full animate-spin-slow"></div>
    <div className="absolute inset-[3px] border border-current opacity-15 rounded-full"></div>
    <div className="w-full h-full flex items-center justify-center p-[18%]">
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/e/ef/State_emblem_of_Pakistan.svg" 
        alt="Govt Seal" 
        className="w-full h-full object-contain opacity-100 drop-shadow-sm"
      />
    </div>
  </div>
);

interface InputFieldProps {
  label: string;
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  options?: {value: string, label: string}[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error: string | null;
  isValid: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, id, name, type = "text", placeholder, options, value, onChange, onBlur, error, isValid 
}) => {
  const hasError = !!error;
  const baseClasses = "w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 transition-all duration-200 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = hasError 
    ? "border-red-500/50 focus:border-red-500 bg-red-50/10 pr-12" 
    : "border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-pakistan-green focus:bg-white dark:focus:bg-gray-800 focus:shadow-[0_0_0_4px_rgba(1,65,28,0.1)] pr-12";

  return (
    <div className="w-full group">
      <label htmlFor={id} className={`block text-[10px] font-lemon tracking-widest mb-2.5 transition-colors duration-200 ${hasError ? 'text-red-500' : 'text-gray-500 group-focus-within:text-pakistan-green dark:text-gray-400 dark:group-focus-within:text-green-400'}`}>
        {label}
      </label>
      <div className="relative">
        {type === "select" ? (
          <div className="relative">
            <select id={id} name={name} value={value} onChange={onChange} onBlur={onBlur} className={`${baseClasses} ${stateClasses} appearance-none cursor-pointer`}>
              <option value="" disabled className="text-gray-400">{placeholder}</option>
              {options?.map(opt => <option key={opt.value} value={opt.value} className="text-gray-900 dark:text-white bg-white dark:bg-gray-900">{opt.label}</option>)}
            </select>
            <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${hasError ? 'text-red-400' : 'text-gray-400 group-focus-within:text-pakistan-green'}`}>
              <i className="fa-solid fa-chevron-down text-xs"></i>
            </div>
          </div>
        ) : (
          <input id={id} type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`${baseClasses} ${stateClasses}`} />
        )}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
           {hasError && <i className="fa-solid fa-circle-exclamation text-red-500 text-lg animate-in zoom-in duration-300"></i>}
           {isValid && !hasError && type !== 'select' && <i className="fa-solid fa-check-circle text-pakistan-green text-lg animate-in zoom-in duration-300"></i>}
        </div>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${hasError ? 'max-h-8 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center gap-2 text-red-500 pl-1">
          <i className="fa-solid fa-circle-info text-[10px]"></i>
          <span className="text-[10px] font-bold tracking-wide uppercase">{error}</span>
        </div>
      </div>
    </div>
  );
};

const MembershipForm: React.FC<Props> = ({ initialPlanId, onClose }) => {
  const [formData, setFormData] = useState<Partial<MembershipApplication>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.formData || { planId: initialPlanId || '', fullName: '', cnic: '', email: '', whatsapp: '' };
      } catch (e) { console.error(e); }
    }
    return { planId: initialPlanId || '', fullName: '', cnic: '', email: '', whatsapp: '' };
  });

  const [step, setStep] = useState<FormStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.step || (initialPlanId ? 2 : 1);
      } catch (e) {}
    }
    return initialPlanId ? 2 : 1;
  });

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showChallan, setShowChallan] = useState(false);
  const [challanId] = useState(() => `FMS-${Math.floor(100000 + Math.random() * 900000)}`);
  
  // New state for exit confirmation
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isSubmitted && !isSubmitting) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, step }));
    }
  }, [formData, step, isSubmitted, isSubmitting]);

  const hasUnsavedChanges = useCallback(() => {
    if (isSubmitted || showChallan) return false;
    // Considered "progress" if past step 1, or if specific text fields have content
    const hasData = formData.fullName || formData.cnic || formData.email || formData.whatsapp;
    return step > 1 || !!hasData;
  }, [formData, step, isSubmitted, showChallan]);

  const handleAttemptClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        if (showExitConfirm) {
           setShowExitConfirm(false); // Close confirmation on escape if open
        } else {
           handleAttemptClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => { 
      document.body.style.overflow = originalOverflow; 
      window.removeEventListener('keydown', handleEscape); 
    };
  }, [handleAttemptClose, showExitConfirm]);

  const validateField = (name: string, value: string): string | null => {
    if (name === 'referralSource') return null;
    if (!value || value.trim() === '') return 'Required';
    if (name === 'fullName' && value.length < 3) return 'Too short';
    if (name === 'whatsapp' && value.length < 10) return 'Invalid number';
    return null;
  };

  const getFieldError = (name: string) => {
    if (!touchedFields[name]) return null;
    return validateField(name, (formData as any)[name] || '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    if (name === 'cnic') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      if (cleaned.length > 5) formatted = cleaned.slice(0, 5) + '-' + cleaned.slice(5);
      if (cleaned.length > 12) formatted = formatted.slice(0, 12) + '-' + cleaned.slice(12, 13);
      setFormData(prev => ({ ...prev, cnic: formatted.slice(0, 15) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (planId: string) => {
    setFormData(prev => ({ ...prev, planId }));
    setTimeout(() => setStep(2), 400);
  };

  const nextStep = () => {
    const currentFields = step === 2 ? ['fullName', 'cnic', 'email', 'whatsapp'] : 
                         step === 3 ? (formData.planId === 'student' ? ['institute', 'degree'] : formData.planId === 'entrepreneur' ? ['businessName', 'industry'] : ['experience', 'targetCountry']) : [];
    let hasErrors = false;
    const newTouched = { ...touchedFields };
    currentFields.forEach(f => {
      newTouched[f] = true;
      if (validateField(f, (formData as any)[f])) hasErrors = true;
    });
    setTouchedFields(newTouched);
    if (!hasErrors && step < 4) setStep((prev) => (prev + 1) as FormStep);
  };

  const prevStep = () => { if (step > 1) setStep((prev) => (prev - 1) as FormStep); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    setIsSubmitting(true);
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => { setIsSubmitting(false); setIsSubmitted(true); }, 2500);
  };

  const isStepValid = () => {
    if (step === 1) return !!formData.planId;
    if (step === 2) return !validateField('fullName', formData.fullName || '') && !validateField('cnic', formData.cnic || '') && !validateField('email', formData.email || '') && !validateField('whatsapp', formData.whatsapp || '');
    if (step === 3) {
      if (formData.planId === 'student') return !!formData.institute && !!formData.degree;
      if (formData.planId === 'entrepreneur') return !!formData.businessName && !!formData.industry;
      if (formData.planId === 'professional') return !!formData.experience && !!formData.targetCountry;
    }
    if (step === 4) return termsAccepted;
    return false;
  };

  const renderInputField = (label: string, id: string, name: keyof MembershipApplication, type: string = "text", placeholder: string = "", options?: {value: string, label: string}[]) => {
     const val = (formData as any)[name] || '';
     const error = getFieldError(name);
     const touched = touchedFields[name];
     return <InputField label={label} id={id} name={name} type={type} placeholder={placeholder} options={options} value={val} onChange={handleInputChange} onBlur={(e) => setTouchedFields(p => ({...p, [e.target.name]: true}))} error={error} isValid={!error && touched && !!val} />;
  };

  // Exit Confirmation Dialog Overlay
  const ExitConfirmationDialog = () => (
    <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-xs text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700 transform scale-100 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <i className="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Discard Changes?</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          You have unsaved progress. Are you sure you want to leave?
        </p>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setShowExitConfirm(false)}
            className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold text-xs transition-colors"
          >
            No, Keep Editing
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-xs transition-colors"
          >
            Yes, Discard & Exit
          </button>
        </div>
      </div>
    </div>
  );

  if (isSubmitting) {
    return (
      <div role="alert" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-pakistan-green rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-pakistan-green animate-pulse"><i className="fa-solid fa-shield-halved text-xl"></i></div>
          </div>
          <h2 className="text-xl font-lemon dark:text-white mb-2">Processing Securely</h2>
          <p className="text-gray-500 text-[10px] font-lemon tracking-widest uppercase">Verified by Govt. Servers</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    if (showChallan) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative border-4 border-gray-100 dark:border-gray-800 overflow-hidden">
            <button onClick={onClose} className="absolute top-2 right-2 z-50 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-sm transition-colors"><i className="fa-solid fa-times text-xs"></i></button>
            <div className="bg-pakistan-green p-4 text-white flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-2">
                     <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-sm font-bold border border-white/20">1</div>
                     <div><h3 className="font-lemon text-xs tracking-wide leading-none">First Nobel Step</h3><p className="text-[7px] uppercase tracking-widest opacity-80 mt-1">(Pvt.) Ltd.</p></div>
                </div>
                <div className="relative z-10 text-right"><h2 className="text-xs font-black uppercase">Fee Challan</h2><p className="text-[9px] font-mono opacity-80">#{challanId.split('-')[1]}</p></div>
            </div>
            <div className="p-5 relative bg-white">
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><OfficialSeal className="w-40 h-40 -rotate-12" /></div>
                <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                    <div className="col-span-2 border-b border-gray-50 pb-1">
                        <h4 className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Applicant</h4>
                        <p className="text-sm font-bold text-gray-900 leading-none">{formData.fullName}</p>
                    </div>
                    <div><h4 className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">CNIC</h4><p className="text-[10px] font-mono font-bold text-gray-700">{formData.cnic}</p></div>
                    <div className="text-right"><h4 className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</h4><p className="text-[10px] font-mono font-bold text-gray-700">{new Date().toLocaleDateString()}</p></div>
                </div>
                <div className="border border-gray-100 rounded-lg overflow-hidden mb-4 relative z-10">
                    <table className="w-full text-[10px] text-left">
                        <thead className="bg-gray-50 text-gray-400 font-bold text-[7px] uppercase tracking-wider"><tr><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5 text-right">PKR</th></tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            <tr><td className="px-2 py-2"><span className="font-bold text-gray-800">Processing Fee</span><br/><span className="text-[8px] text-gray-400 capitalize">{formData.planId} Program</span></td><td className="px-2 py-2 text-right font-mono font-bold text-gray-900">1,500</td></tr>
                            <tr className="bg-pakistan-green/5"><td className="px-2 py-1.5 text-right font-bold text-pakistan-green uppercase text-[8px]">Payable</td><td className="px-2 py-1.5 text-right font-black text-sm text-pakistan-green font-mono">1,500</td></tr>
                        </tbody>
                    </table>
                </div>
                <div className="space-y-3 relative z-10">
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100"><p className="text-[8px] text-gray-600 leading-tight">Pay via any Bank App / EasyPaisa / JazzCash. Provide Challan ID as payment reference.</p></div>
                    <div className="flex justify-between items-center border-t border-dashed border-gray-100 pt-2">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-pakistan-green text-[7px] font-bold uppercase rounded border border-green-100">Govt Verified</div>
                        <div className="text-right"><div className="h-4 w-20 bg-[repeating-linear-gradient(90deg,#000,#000_1px,transparent_1px,transparent_2px)] opacity-30 mb-0.5"></div><p className="text-[6px] text-gray-400 font-mono tracking-widest uppercase">Digital Copy</p></div>
                    </div>
                </div>
                <button onClick={() => window.print()} className="w-full mt-4 py-3 bg-pakistan-green text-white rounded-xl font-lemon text-[10px] tracking-widest hover:bg-green-800 transition-all shadow-lg flex items-center justify-center gap-2">Get Challan</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative">
          <div className="absolute top-6 right-6"><OfficialSeal className="w-12 h-12" /></div>
          <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pakistan-green"><i className="fa-solid fa-check text-2xl animate-bounce"></i></div>
          <h2 className="text-xl font-lemon mb-2 dark:text-white">Applied!</h2>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">Your details are registered. Generate your processing challan to complete the application.</p>
          <button onClick={() => setShowChallan(true)} className="w-full py-4 bg-pakistan-green text-white rounded-2xl font-lemon text-xs tracking-widest shadow-lg">Generate Challan</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => e.target === e.currentTarget && handleAttemptClose()}>
      <div ref={modalRef} role="dialog" className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Render Exit Confirmation Dialog Over Main Form */}
        {showExitConfirm && <ExitConfirmationDialog />}

        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div><h2 className="text-2xl font-lemon tracking-tight dark:text-white">Processing Fees</h2><p className="text-[10px] font-lemon text-pakistan-green tracking-widest mt-1">Official Govt. Registered Portal</p></div>
          <button ref={closeButtonRef} onClick={handleAttemptClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><i className="fa-solid fa-times text-gray-400"></i></button>
        </div>
        <nav className="px-8 py-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 -z-10"></div>
            <div className="absolute top-1/2 left-0 h-0.5 bg-pakistan-green transition-all duration-500 -translate-y-1/2 -z-10" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            {[1,2,3,4].map(n => (
              <div key={n} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-lemon transition-all border-2 ${step >= n ? 'bg-pakistan-green border-pakistan-green text-white' : 'bg-white dark:bg-gray-900 border-gray-200 text-gray-400'}`}>{n}</div>
              </div>
            ))}
          </div>
        </nav>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-8 py-6 custom-scrollbar">
          {step === 1 && (
            <fieldset className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <legend className="text-sm font-medium mb-4 dark:text-gray-300">Select processing category:</legend>
              {[{id:'professional',name:'Professional',icon:'fa-briefcase'},{id:'entrepreneur',name:'Entrepreneur',icon:'fa-rocket'},{id:'student',name:'Official Student',icon:'fa-graduation-cap'}].map(p => (
                <label key={p.id} onClick={() => handlePlanSelect(p.id)} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.planId === p.id ? 'border-pakistan-green bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.planId === p.id ? 'bg-pakistan-green text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}><i className={`fa-solid ${p.icon}`}></i></div>
                  <h4 className="font-lemon text-sm dark:text-white">{p.name}</h4>
                  <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.planId === p.id ? 'border-pakistan-green bg-pakistan-green text-white' : 'border-gray-200'}`}>{formData.planId === p.id && <i className="fa-solid fa-check text-[10px]"></i>}</div>
                </label>
              ))}
            </fieldset>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {renderInputField("Full Name (As per CNIC)", "fullName", "fullName")}
              {renderInputField("CNIC Number", "cnic", "cnic")}
              {renderInputField("Email Address", "email", "email", "email")}
              {renderInputField("WhatsApp Number", "whatsapp", "whatsapp", "tel")}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {formData.planId === 'student' && (
                <div className="space-y-6">
                  {renderInputField("Academic Institution", "institute", "institute", "text", "e.g. University of the Punjab")}
                  {renderInputField("Current Degree", "degree", "degree", "text", "e.g. BS Computer Science")}
                </div>
              )}
              {formData.planId === 'entrepreneur' && (
                <div className="space-y-6">
                  {renderInputField("Business Name", "businessName", "businessName", "text", "e.g. NextGen Solutions")}
                  {renderInputField("Industry", "industry", "industry", "select", "Select Industry", [
                    {value:'tech',label:'Technology & IT'},
                    {value:'retail',label:'Retail & E-commerce'},
                    {value:'agriculture',label:'Agriculture'},
                    {value:'services',label:'Professional Services'},
                    {value:'other',label:'Other'}
                  ])}
                </div>
              )}
              {formData.planId === 'professional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInputField("Years of Experience", "experience", "experience", "text", "e.g. 3 Years")}
                  {renderInputField("Target Country", "targetCountry", "targetCountry", "select", "Select Country", [
                    {value:'usa',label:'United States'},
                    {value:'uk',label:'United Kingdom'},
                    {value:'canada',label:'Canada'},
                    {value:'uae',label:'UAE & Gulf'},
                    {value:'europe',label:'Europe (Schengen)'},
                    {value:'australia',label:'Australia'},
                    {value:'other',label:'Other'}
                  ])}
                </div>
              )}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-green-50/50 dark:bg-green-900/10 p-6 rounded-[1.5rem] border border-green-100 dark:border-green-800/50 relative overflow-hidden">
                <div className="absolute top-4 right-4"><OfficialSeal className="w-12 h-12 opacity-80" /></div>
                <h4 className="font-lemon text-[10px] text-pakistan-green dark:text-green-400 mb-6 uppercase tracking-widest">Application Review</h4>
                <div className="grid grid-cols-2 gap-4 text-xs relative z-10">
                  <div><span className="text-gray-400 text-[10px] uppercase">Name</span><span className="font-bold dark:text-white block">{formData.fullName}</span></div>
                  <div><span className="text-gray-400 text-[10px] uppercase">CNIC</span><span className="font-bold dark:text-white block font-mono">{formData.cnic}</span></div>
                </div>
              </div>
              <label className="flex items-start gap-4 p-5 cursor-pointer bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 h-5 w-5 rounded border-gray-300 text-pakistan-green" />
                <span className="text-xs text-gray-600 dark:text-gray-400">I declare all information is correct as per Government records.</span>
              </label>
            </div>
          )}
        </form>
        <div className="px-8 pb-8 pt-4 flex gap-4 border-t border-gray-100 dark:border-gray-800">
          {step > 1 && <button type="button" onClick={prevStep} className="px-6 py-4 rounded-2xl font-lemon text-[10px] border border-gray-200 text-gray-500">Back</button>}
          <button type="button" onClick={step === 4 ? (e) => handleSubmit(e as any) : nextStep} disabled={!isStepValid()} className={`flex-grow py-4 rounded-2xl font-lemon text-[10px] tracking-widest text-white transition-all ${!isStepValid() ? 'bg-gray-200 cursor-not-allowed' : 'bg-pakistan-green shadow-lg'}`}>{step === 4 ? 'Submit Application' : 'Continue'}</button>
        </div>
      </div>
    </div>
  );
};

export default MembershipForm;
