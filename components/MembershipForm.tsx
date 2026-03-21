
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { FormStep, MembershipApplication } from '../types.ts';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      console.error(error);
    } else {
      console.log('PaymentMethod:', paymentMethod);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-4 border rounded-2xl" />
      <button type="submit" disabled={!stripe} className="w-full bg-pakistan-green text-white py-4 rounded-2xl">
        Pay Now
      </button>
    </form>
  );
};

interface Props {
  initialPlanId: string | null;
  onClose: () => void;
}

const STORAGE_KEY = 'fms_membership_progress';

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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error: string | null;
  isValid: boolean;
  tooltip?: string;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, id, name, type = "text", placeholder, options, value, onChange, onBlur, onKeyDown, error, isValid, tooltip 
}) => {
  const hasError = !!error;
  const baseClasses = "w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border-2 transition-all duration-200 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = hasError 
    ? "border-red-500/50 focus:border-red-500 bg-red-50/10 pr-12" 
    : "border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-pakistan-green focus:bg-white dark:focus:bg-gray-800 focus:shadow-[0_0_0_4px_rgba(1,65,28,0.1)] pr-12";

  return (
    <div className="w-full group">
      <div className="flex items-center justify-between mb-2.5">
        <label htmlFor={id} className={`block text-[10px] font-lemon tracking-widest transition-colors duration-200 ${hasError ? 'text-red-500' : 'text-gray-500 group-focus-within:text-pakistan-green dark:text-gray-400 dark:group-focus-within:text-green-400'}`}>
          {label}
        </label>
        {tooltip && (
          <div className="relative group/tooltip">
            <i className="fa-solid fa-circle-info text-[10px] text-gray-400 hover:text-pakistan-green transition-colors cursor-help"></i>
            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10">
              <div className="relative z-10">{tooltip}</div>
              <div className="absolute top-full right-2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        {type === "select" ? (
          <div className="relative">
            <select id={id} name={name} value={value} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown} className={`${baseClasses} ${stateClasses} appearance-none cursor-pointer`}>
              <option value="" disabled className="text-gray-400">{placeholder}</option>
              {options?.map(opt => <option key={opt.value} value={opt.value} className="text-gray-900 dark:text-white bg-white dark:bg-gray-900">{opt.label}</option>)}
            </select>
            <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${hasError ? 'text-red-400' : 'text-gray-400 group-focus-within:text-pakistan-green'}`}>
              <i className="fa-solid fa-chevron-down text-xs"></i>
            </div>
          </div>
        ) : (
          <input id={id} type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown} placeholder={placeholder} className={`${baseClasses} ${stateClasses}`} />
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

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.touchedFields || {};
      } catch (e) {}
    }
    return {};
  });

  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.termsAccepted || false;
      } catch (e) {}
    }
    return false;
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // New state for exit confirmation
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isSubmitted && !isSubmitting) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, step, touchedFields, termsAccepted }));
    }
  }, [formData, step, touchedFields, termsAccepted, isSubmitted, isSubmitting]);

  const hasUnsavedChanges = useCallback(() => {
    if (isSubmitted) return false;
    // Considered "progress" if past step 1, or if specific text fields have content
    const hasData = formData.fullName || formData.cnic || formData.email || formData.whatsapp;
    return step > 1 || !!hasData;
  }, [formData, step, isSubmitted]);

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
    
    if (name === 'fullName') {
      if (value.length < 3) return 'Full Name must be at least 3 characters';
      if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters and spaces allowed';
    }
    
    if (name === 'cnic') {
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!cnicRegex.test(value)) return 'Format: 12345-1234567-1';
    }
    
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) return 'Invalid email address';
    }
    
    if (name === 'whatsapp') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 11) return 'Minimum 11 digits required';
      if (cleaned.length > 13) return 'Maximum 13 digits allowed';
    }
    
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
    if (name === 'whatsapp') {
      const cleaned = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, whatsapp: cleaned.slice(0, 13) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (planId: string) => {
    setFormData(prev => ({ ...prev, planId }));
    setTimeout(() => setStep(2), 400);
  };

  const nextStep = async () => {
    const currentFields = step === 2 ? ['fullName', 'cnic', 'email', 'whatsapp'] : 
                         step === 3 ? (formData.planId === 'student' ? ['institute', 'degree'] : formData.planId === 'entrepreneur' ? ['businessName', 'industry'] : ['experience', 'targetCountry']) : [];
    let hasErrors = false;
    const newTouched = { ...touchedFields };
    currentFields.forEach(f => {
      newTouched[f] = true;
      if (validateField(f, (formData as any)[f])) hasErrors = true;
    });
    setTouchedFields(newTouched);
    
    if (!hasErrors) {
      if (step === 4) {
        setStep(5);
      } else if (step < 5) {
        setStep((prev) => (prev + 1) as FormStep);
      }
    }
  };

  const sendVerificationCode = async () => {
    // This is no longer needed
  };

  const prevStep = () => { if (step > 1) setStep((prev) => (prev - 1) as FormStep); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || !formData.paymentMethod) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = { 
        ...formData, 
        email: formData.email?.trim(), 
      };
      const response = await fetch('/api/submit-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application. Please try again later.");
      }

      localStorage.removeItem(STORAGE_KEY);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Submission Error:', err);
      setError(err.message || "An unexpected error occurred during submission.");
      
      // If code is invalid, move back to verification step
      if (err.message.toLowerCase().includes('code')) {
        setStep(5);
        setVerificationCode('');
      }
    } finally {
      setIsSubmitting(false);
    }
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
    if (step === 5) return !!formData.paymentMethod;
    return false;
  };

  const renderInputField = (label: string, id: string, name: keyof MembershipApplication, type: string = "text", placeholder: string = "", options?: {value: string, label: string}[], tooltip?: string) => {
     const val = (formData as any)[name] || '';
     const error = getFieldError(name);
     const touched = touchedFields[name];
     
     const handleKeyDown = (e: React.KeyboardEvent) => {
       if (e.key === 'Enter') {
         e.preventDefault();
         if (isStepValid()) {
           nextStep();
         }
       }
     };

     return <InputField label={label} id={id} name={name} type={type} placeholder={placeholder} options={options} value={val} onChange={handleInputChange} onBlur={(e) => setTouchedFields(p => ({...p, [e.target.name]: true}))} onKeyDown={handleKeyDown} error={error} isValid={!error && touched && !!val} tooltip={tooltip} />;
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
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              onClose();
            }}
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
          <p className="text-gray-500 text-[10px] font-lemon tracking-widest uppercase">Verified Servers</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative">
          <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pakistan-green"><i className="fa-solid fa-check text-2xl animate-bounce"></i></div>
          <h2 className="text-xl font-lemon mb-2 dark:text-white">Applied!</h2>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">Your details are submitted successfully. We will review your application and get back to you soon.</p>
          <button onClick={onClose} className="w-full py-4 bg-pakistan-green text-white rounded-2xl font-lemon text-xs tracking-widest shadow-lg">Close</button>
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
          <div><h2 className="text-2xl font-lemon tracking-tight dark:text-white">Processing Fees</h2><p className="text-[10px] font-lemon text-pakistan-green tracking-widest mt-1">Official Portal</p></div>
          <button ref={closeButtonRef} onClick={handleAttemptClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><i className="fa-solid fa-times text-gray-400"></i></button>
        </div>
        <nav className="px-8 py-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 -z-10"></div>
            <motion.div 
              className="absolute top-1/2 left-0 h-0.5 bg-pakistan-green -translate-y-1/2 -z-10" 
              initial={{ width: 0 }}
              animate={{ width: `${((step - 1) / 5) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
            {[1,2,3,4,5,6].map(n => (
              <motion.div key={n} className="flex flex-col items-center" initial={{ scale: 0.8 }} animate={{ scale: step >= n ? 1 : 0.9 }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-lemon transition-all border-2 ${step >= n ? 'bg-pakistan-green border-pakistan-green text-white' : 'bg-white dark:bg-gray-900 border-gray-200 text-gray-400'}`}>{n}</div>
              </motion.div>
            ))}
          </div>
        </nav>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-8 py-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && (
                <fieldset className="space-y-8">
              <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                <h4 className="text-[10px] font-lemon tracking-[0.2em] text-pakistan-green mb-6 uppercase flex items-center gap-3">
                  <span className="w-6 h-px bg-pakistan-green/20"></span> Individual Pathways
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[{id:'professional',name:'Job Professional',icon:'fa-briefcase'},{id:'student',name:'Official Student',icon:'fa-graduation-cap'}].map(p => (
                    <label key={p.id} onClick={() => handlePlanSelect(p.id)} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.planId === p.id ? 'border-pakistan-green bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.planId === p.id ? 'bg-pakistan-green text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}><i className={`fa-solid ${p.icon}`}></i></div>
                      <h4 className="font-lemon text-[10px] dark:text-white">{p.name}</h4>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.planId === p.id ? 'border-pakistan-green bg-pakistan-green text-white' : 'border-gray-200'}`}>{formData.planId === p.id && <i className="fa-solid fa-check text-[10px]"></i>}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-[10px] font-lemon tracking-[0.2em] text-pakistan-green mb-6 uppercase flex items-center gap-3">
                  <span className="w-6 h-px bg-pakistan-green/20"></span> Business Growth
                </h4>
                {[{id:'entrepreneur',name:'Entrepreneur',icon:'fa-rocket'}].map(p => (
                  <label key={p.id} onClick={() => handlePlanSelect(p.id)} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.planId === p.id ? 'border-pakistan-green bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.planId === p.id ? 'bg-pakistan-green text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}><i className={`fa-solid ${p.icon}`}></i></div>
                    <h4 className="font-lemon text-[10px] dark:text-white">{p.name}</h4>
                    <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.planId === p.id ? 'border-pakistan-green bg-pakistan-green text-white' : 'border-gray-200'}`}>{formData.planId === p.id && <i className="fa-solid fa-check text-[10px]"></i>}</div>
                  </label>
                ))}
              </div>
            </fieldset>
              )}
              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInputField("Full Name (As per CNIC)", "fullName", "fullName", "text", "Enter Full Name", undefined, "Enter your full name exactly as it appears on your CNIC.")}
              {renderInputField("CNIC Number", "cnic", "cnic", "text", "XXXXX-XXXXXXX-X", undefined, "Enter your 13-digit CNIC number in the format: 12345-1234567-1")}
              {renderInputField("Email Address", "email", "email", "email", "name@example.com", undefined, "Provide a valid email address for verification and communication.")}
              {renderInputField("WhatsApp Number", "whatsapp", "whatsapp", "tel", "923XXXXXXXXX", undefined, "Enter your WhatsApp number starting with 92 (e.g., 923001234567).")}
            </div>
              )}
              {step === 3 && (
                <div className="space-y-6">
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
                <div className="space-y-8">
              <div className="bg-green-50/50 dark:bg-green-900/10 p-6 rounded-[1.5rem] border border-green-100 dark:border-green-800/50 relative overflow-hidden">
                <h4 className="font-lemon text-[10px] text-pakistan-green dark:text-green-400 mb-6 uppercase tracking-widest">Application Review</h4>
                <div className="grid grid-cols-2 gap-4 text-xs relative z-10">
                  <div><span className="text-gray-400 text-[10px] uppercase">Name</span><span className="font-bold dark:text-white block">{formData.fullName}</span></div>
                  <div><span className="text-gray-400 text-[10px] uppercase">CNIC</span><span className="font-bold dark:text-white block font-mono">{formData.cnic}</span></div>
                </div>
              </div>
              <label className="flex items-start gap-4 p-5 cursor-pointer bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 h-5 w-5 rounded border-gray-300 text-pakistan-green" />
                <span className="text-xs text-gray-600 dark:text-gray-400">I declare all information is correct and I agree to the <a href="https://drive.google.com/file/d/1NwKfofJT-kQ5veAhZVj0ebYeB6Tauk4I/view?usp=drivesdk" target="_blank" className="text-pakistan-green dark:text-green-400 underline hover:text-green-700 transition-colors">Privacy Policy</a>.</span>
              </label>
            </div>
              )}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-pakistan-green">
                      <i className="fa-solid fa-wallet text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-lemon dark:text-white">Select Payment Method</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Choose how you want to pay your processing fee.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <label onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'jazzcash' }))} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'jazzcash' ? 'border-pakistan-green bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                      <div className="w-16 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 dark:border-gray-700 p-2 shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/JazzCash_logo.svg/1200px-JazzCash_logo.svg.png" alt="JazzCash" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-sm dark:text-white">JazzCash</h4>
                        <p className="text-[10px] text-gray-400">Pay directly via JazzCash app</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'jazzcash' ? 'border-pakistan-green bg-pakistan-green text-white' : 'border-gray-200'}`}>
                        {formData.paymentMethod === 'jazzcash' && <i className="fa-solid fa-check text-[10px]"></i>}
                      </div>
                    </label>
                    <label onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'easypaisa' }))} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'easypaisa' ? 'border-pakistan-green bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                      <div className="w-16 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 dark:border-gray-700 p-2 shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Easypaisa_logo.svg/1200px-Easypaisa_logo.svg.png" alt="Easypaisa" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-sm dark:text-white">Easypaisa</h4>
                        <p className="text-[10px] text-gray-400">Pay directly via Easypaisa app</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'easypaisa' ? 'border-pakistan-green bg-pakistan-green text-white' : 'border-gray-200'}`}>
                        {formData.paymentMethod === 'easypaisa' && <i className="fa-solid fa-check text-[10px]"></i>}
                      </div>
                    </label>
                    <label onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'card' }))} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${formData.paymentMethod === 'card' ? 'border-pakistan-green bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                      <div className="w-16 h-12 rounded-xl flex flex-col items-center justify-center bg-white border border-gray-100 dark:border-gray-700 gap-1.5 py-2 shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-2.5 object-contain" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-3.5 object-contain" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-sm dark:text-white">Credit / Debit Card</h4>
                        <p className="text-[10px] text-gray-400">Visa, Mastercard, UnionPay</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === 'card' ? 'border-pakistan-green bg-pakistan-green text-white' : 'border-gray-200'}`}>
                        {formData.paymentMethod === 'card' && <i className="fa-solid fa-check text-[10px]"></i>}
                      </div>
                    </label>
                  </div>

                  {formData.paymentMethod === 'card' && (
                    <Elements stripe={stripePromise}>
                      <PaymentForm />
                    </Elements>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </form>
        <div className="px-8 pb-8 pt-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}
          <div className="flex gap-4">
            {step > 1 && <button type="button" onClick={prevStep} className="px-6 py-4 rounded-2xl font-lemon text-[10px] border border-gray-200 text-gray-500">Back</button>}
            <button type="button" onClick={step === 5 ? (e) => handleSubmit(e as any) : nextStep} disabled={!isStepValid() || isSendingCode} className={`flex-grow py-4 rounded-2xl font-lemon text-[10px] tracking-widest text-white transition-all ${!isStepValid() || isSendingCode ? 'bg-gray-200 cursor-not-allowed' : 'bg-pakistan-green shadow-lg'}`}>{step === 5 ? 'Submit Payment' : 'Continue'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipForm;
