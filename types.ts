
export interface MembershipPlan {
  id: string;
  name: string;
  category: 'Entrepreneur' | 'Student' | 'Professional';
  description: string;
  features: string[];
  isPopular?: boolean;
}

export interface VerificationResult {
  isVerified: boolean;
  registrationId: string;
  date: string;
  authority: string;
  explanation: string;
}

export interface MembershipApplication {
  planId: string;
  fullName: string;
  cnic: string;
  email: string;
  whatsapp: string;
  referralSource?: string;
  // Step 3 specific fields
  institute?: string;
  degree?: string;
  businessName?: string;
  industry?: string;
  experience?: string;
  targetCountry?: string;
}

export type FormStep = 1 | 2 | 3 | 4;
