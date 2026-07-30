import React, { useState, useEffect, useRef } from 'react';

interface Props {
  initialPlanId: string | null;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface FormDataState {
  planId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  address: string;
  university: string;
  otp: string;
  otpHash: string | null;
  paymentProofBase64: string | null;
  paymentMethod: string;
}

const plans = [
  { id: 'basic', name: 'Basic Package', price: 'PKR 2,500', original: 'PKR 5,000', icon: 'fa-leaf', color: 'green' },
  { id: 'standard', name: 'Standard Package', price: 'PKR 6,999', original: 'PKR 14,000', icon: 'fa-star', color: 'blue' },
  { id: 'professional_pkg', name: 'Premium Package', price: 'PKR 14,999', original: 'PKR 30,000', icon: 'fa-crown', color: 'amber' },
  { id: 'entrepreneur', name: 'Entrepreneur', price: 'PKR 49,999', original: 'PKR 70,000', icon: 'fa-rocket', color: 'green' },
  { id: 'e_internship', name: 'E-Internship', price: 'Free', original: '', icon: 'fa-bolt', color: 'yellow' },
];

const MembershipForm: React.FC<Props> = ({ initialPlanId, onClose }) => {
  const [step, setStep] = useState<Step>(initialPlanId ? 2 : 1);
  const [formData, setFormData] = useState<FormDataState>({
    planId: initialPlanId || '',
    fullName: '',
    email: '',
    whatsapp: '',
    address: '',
    university: '',
    otp: '',
    otpHash: null,
    paymentProofBase64: null,
    paymentMethod: 'faysalbank',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpStatus, setOtpStatus] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [otpBoxes, setOtpBoxes] = useState<string[]>(['', '', '', '', '', '']);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitConfirm) setShowExitConfirm(false);
        else handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showExitConfirm, step, formData]);

  const handleAttemptClose = () => {
    const hasData = formData.fullName || formData.email || formData.whatsapp || formData.paymentProofBase64;
    if (step > 1 || hasData) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const validateStep = (currentStep = step): boolean => {
    if (currentStep === 1) return !!formData.planId;
    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const nameValid = formData.fullName.trim().length >= 3;
      const emailValid = emailRegex.test(formData.email);
      const whatsappClean = formData.whatsapp.replace(/\D/g, '');
      const whatsappValid = formData.planId === 'e_internship' ? true : whatsappClean.length >= 10 && whatsappClean.length <= 13;
      const addressValid = formData.planId === 'e_internship' ? formData.address.trim().length >= 5 : true;
      return nameValid && emailValid && whatsappValid && addressValid;
    }
    if (currentStep === 3) return formData.otp.length === 6;
    if (currentStep === 4) {
      if (formData.planId === 'e_internship') return true;
      return !!formData.paymentProofBase64;
    }
    if (currentStep === 5) return termsAccepted;
    return false;
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      setError('Email is required');
      return;
    }
    setOtpLoading(true);
    setError(null);
    setOtpStatus('Sending...');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, fullName: formData.fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setFormData(prev => ({ ...prev, otpHash: data.hash }));
      setOtpStatus(`Code sent to ${formData.email}`);
    } catch (err: any) {
      setError(err.message);
      setOtpStatus('Failed to send code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (formData.otp.length !== 6) {
      setError('Enter 6-digit code');
      return;
    }
    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: formData.otp, otpHash: formData.otpHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setOtpStatus('Verified successfully!');
      if (formData.planId === 'e_internship') setStep(5);
      else setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setError('Only JPG, PNG, WEBP allowed');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setError('File must be less than 1MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result.length > 2 * 1024 * 1024) {
        setError('Image too large after encoding');
        return;
      }
      setFormData(prev => ({ ...prev, paymentProofBase64: result }));
      setProofPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError('Please accept terms and conditions');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        planId: formData.planId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        whatsapp: formData.whatsapp.trim(),
        address: formData.address.trim(),
        university: formData.university.trim(),
        paymentMethod: formData.paymentMethod,
        paymentProof: formData.paymentProofBase64,
        otp: formData.otp,
        otpHash: formData.otpHash,
      };
      const res = await fetch('/api/submit-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    setError(null);
    if (step === 2) {
      // Send OTP automatically when moving from step 2 to 3
      if (!validateStep(2)) {
        setError('Please fill all required fields correctly');
        return;
      }
      setStep(3);
      setTimeout(() => handleSendOtp(), 300);
    } else if (step === 3) {
      await handleVerifyOtp();
    } else if (step < 5) {
      if (!validateStep()) {
        setError('Please complete this step');
        return;
      }
      setStep((prev) => (prev + 1) as Step);
    } else {
      await handleSubmit();
    }
  };

  const prevStep = () => {
    setError(null);
    if (step > 1) {
      if (step === 5 && formData.planId === 'e_internship') setStep(3);
      else setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleOtpBoxChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const newBoxes = [...otpBoxes];
    newBoxes[index] = clean;
    setOtpBoxes(newBoxes);
    const combined = newBoxes.join('');
    setFormData(prev => ({ ...prev, otp: combined }));
    if (clean && index < 5) {
      const next = document.getElementById(`otp-box-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newBoxes = pasted.split('');
    while (newBoxes.length < 6) newBoxes.push('');
    setOtpBoxes(newBoxes);
    setFormData(prev => ({ ...prev, otp: pasted }));
  };

  if (isSubmitting) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 max-w-md w-full text-center shadow-2xl">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-green-700 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold dark:text-white mb-2">Processing Securely</h2>
          <p className="text-gray-500 text-[10px] tracking-widest uppercase">Verified Servers</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-700">
            <i className="fa-solid fa-check text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold mb-2 dark:text-white">Applied!</h2>
          <p className="text-gray-500 mb-8 text-sm">Your details are submitted successfully. Our team will contact you after verifying payment.</p>
          <button onClick={onClose} className="w-full py-4 bg-green-800 text-white rounded-2xl font-bold text-xs tracking-widest">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => e.target === e.currentTarget && handleAttemptClose()}>
      <div ref={modalRef} className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {showExitConfirm && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px]">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-xs text-center shadow-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Discard Changes?</h3>
              <p className="text-xs text-gray-500 mb-6">You have unsaved progress. Are you sure you want to leave?</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setShowExitConfirm(false)} className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-xs">No, Keep Editing</button>
                <button onClick={onClose} className="w-full py-3 bg-transparent text-red-500 rounded-xl font-bold text-xs">Yes, Discard & Exit</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight dark:text-white">Membership Application</h2>
            <p className="text-[10px] text-green-700 tracking-widest mt-1">Official Portal</p>
          </div>
          <button onClick={handleAttemptClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <i className="fa-solid fa-times text-gray-400"></i>
          </button>
        </div>

        <nav className="px-8 py-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full -translate-y-1/2 -z-10"></div>
            <div className="absolute top-1/2 left-0 h-1 bg-green-800 rounded-full -translate-y-1/2 -z-10 transition-all duration-700" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${step === n ? 'bg-green-800 border-green-800 text-white scale-125 shadow-lg' : step > n ? 'bg-green-800 border-green-800 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 text-gray-400'}`}>
                {step > n ? <i className="fa-solid fa-check text-[7px]"></i> : n}
              </div>
            ))}
          </div>
        </nav>

        <div className="flex-grow overflow-y-auto px-8 py-6 custom-scrollbar">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400">
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <p className="text-xs flex-grow">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-times"></i></button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h4 className="text-[10px] tracking-[0.2em] text-green-800 uppercase flex items-center gap-3"><span className="w-6 h-px bg-green-800/20"></span> Select Package</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map(p => (
                  <div key={p.id} onClick={() => setFormData(prev => ({ ...prev, planId: p.id }))} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.planId === p.id ? 'border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-green-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.color === 'green' ? 'bg-green-100 text-green-600' : p.color === 'blue' ? 'bg-blue-100 text-blue-600' : p.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <i className={`fa-solid ${p.icon}`}></i>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.planId === p.id ? 'bg-green-800 border-green-800 text-white' : 'border-gray-200'}`}>
                        {formData.planId === p.id && <i className="fa-solid fa-check text-[10px]"></i>}
                      </div>
                    </div>
                    <h4 className="font-bold text-[11px] dark:text-white">{p.name}</h4>
                    <p className="text-sm font-bold mt-2 text-green-700 flex items-center gap-1.5 flex-wrap">
                      {p.original && <span className="text-xs text-gray-400 line-through">{p.original}</span>}
                      <span>{p.price}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] tracking-widest text-gray-500 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.fullName} onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-green-800 outline-none text-sm dark:text-white" placeholder="Enter Full Name" />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest text-gray-500 mb-2">Email Address <span className="text-red-500">*</span></label>
                <input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-green-800 outline-none text-sm dark:text-white" placeholder="name@example.com" />
              </div>
              <div>
                <label className="block text-[10px] tracking-widest text-gray-500 mb-2">WhatsApp Number {formData.planId !== 'e_internship' ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-[9px]">(Optional)</span>}</label>
                <input type="tel" value={formData.whatsapp} onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 13) }))} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-green-800 outline-none text-sm dark:text-white" placeholder="e.g., 923001234567" />
              </div>
              {formData.planId === 'e_internship' && (
                <>
                  <div>
                    <label className="block text-[10px] tracking-widest text-gray-500 mb-2">Postal Address <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-green-800 outline-none text-sm dark:text-white" placeholder="Street Address, City, Province, Postal Code" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest text-gray-500 mb-2">University / Institution <span className="text-gray-400 text-[9px]">(Optional)</span></label>
                    <input type="text" value={formData.university} onChange={e => setFormData(prev => ({ ...prev, university: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-green-800 outline-none text-sm dark:text-white" placeholder="Your University Name" />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-800">
                <i className="fa-solid fa-envelope-open-text text-2xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-white">Verify your Email</h3>
                <p className="text-xs text-gray-500 mt-2">Code sent to <strong className="text-green-800">{formData.email}</strong></p>
              </div>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otpBoxes.map((val, idx) => (
                  <input key={idx} id={`otp-box-${idx}`} type="text" maxLength={1} value={val} onChange={e => handleOtpBoxChange(idx, e.target.value)} className="w-11 h-14 text-center font-bold text-xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:border-green-800 outline-none" />
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-green-700">{otpStatus}</span>
                <button type="button" onClick={handleSendOtp} disabled={otpLoading} className="text-xs text-green-800 underline uppercase tracking-wider disabled:opacity-50">
                  {otpLoading ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center">
              {formData.planId === 'e_internship' ? (
                <div className="space-y-4 max-w-sm mx-auto">
                  <h3 className="text-xl font-bold dark:text-white">Free Internship</h3>
                  <p className="text-xs text-gray-500">No payment needed for e-internship!</p>
                  <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 text-xs text-green-700 flex items-center gap-3">
                    <i className="fa-solid fa-circle-check"></i>
                    <span className="text-left">Press Continue to finish your application.</span>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">Complete Payment</h3>
                    <p className="text-sm text-gray-500 mt-1">Total Due: <span className="font-bold text-green-800">{plans.find(p => p.id === formData.planId)?.price}</span></p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 max-w-sm mx-auto overflow-hidden">
                    <div className="bg-[#0A4D5C] py-4 text-center">
                      <span className="text-white font-bold text-3xl">faysalbank</span>
                    </div>
                    <div className="p-6 space-y-3 text-left text-sm">
                      <div><span className="block text-[9px] text-gray-400 uppercase">Account Title</span><strong className="text-[#0A4D5C]">FIRST NOBLE STEP (PRIVATE) LIMITED</strong></div>
                      <div><span className="block text-[9px] text-gray-400 uppercase">Account Number</span><strong className="font-mono">3291499000005525</strong></div>
                      <div><span className="block text-[9px] text-gray-400 uppercase">IBAN</span><strong className="font-mono text-xs break-all">PK03FAYS3291499000005525</strong></div>
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[10px] text-gray-600">
                        Payment will be confirmed within 72 working hours. Fake proof will not be accepted.
                      </div>
                    </div>
                  </div>
                  <div className="max-w-sm mx-auto text-left space-y-2">
                    <label className="block text-[10px] tracking-widest text-gray-500 uppercase">Upload Receipt (Max 1MB)</label>
                    <label className="flex flex-col items-center justify-center w-full min-h-[120px] rounded-[1.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-green-600 cursor-pointer bg-gray-50/50 dark:bg-gray-800/20 relative overflow-hidden">
                      {proofPreview ? (
                        <img src={proofPreview} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-2 bg-white" />
                      ) : (
                        <div className="flex flex-col items-center p-4">
                          <i className="fa-solid fa-cloud-arrow-up text-xl text-gray-400 mb-2"></i>
                          <p className="text-[11px] text-gray-500">Click to attach screenshot</p>
                        </div>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProofUpload} className="hidden" />
                    </label>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{formData.paymentProofBase64 ? 'File attached' : 'No file selected'}</span>
                      {formData.paymentProofBase64 && <button type="button" onClick={() => { setFormData(prev => ({ ...prev, paymentProofBase64: null })); setProofPreview(null); }} className="text-red-500">Clear</button>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-green-50/50 dark:bg-green-900/10 p-6 rounded-[1.5rem] border border-green-100">
                <h4 className="text-[10px] text-green-800 uppercase tracking-widest mb-4">Application Review</h4>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div><span className="text-gray-400 text-[10px] uppercase">Name</span><span className="font-bold block dark:text-white">{formData.fullName || '--'}</span></div>
                  <div><span className="text-gray-400 text-[10px] uppercase">Email</span><span className="font-bold block dark:text-white">{formData.email || '--'}</span></div>
                  <div><span className="text-gray-400 text-[10px] uppercase">WhatsApp</span><span className="font-bold block dark:text-white">{formData.whatsapp || '--'}</span></div>
                  <div><span className="text-gray-400 text-[10px] uppercase">Plan</span><span className="font-bold block dark:text-white">{formData.planId}</span></div>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-800" />
                <span className="text-xs text-gray-600 dark:text-gray-400">I declare all information is correct and I agree to the <a href="/privacy-policy.html" className="text-green-800 underline">Privacy Policy</a> and <a href="/terms-and-conditions.html" className="text-green-800 underline">Terms & Conditions</a>.</span>
              </label>
            </div>
          )}
        </div>

        <div className="px-8 pb-8 pt-4 flex gap-4 border-t border-gray-100 dark:border-gray-800">
          {step > 1 && <button type="button" onClick={prevStep} className="px-6 py-4 rounded-2xl text-[10px] border border-gray-200 text-gray-500">Back</button>}
          <button type="button" onClick={nextStep} disabled={!validateStep() || otpLoading} className={`flex-grow py-4 rounded-2xl text-[10px] tracking-widest text-white transition-all ${!validateStep() ? 'bg-gray-200 cursor-not-allowed' : 'bg-green-800 hover:bg-green-900 shadow-lg'}`}>
            {step === 5 ? 'Submit' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembershipForm;
