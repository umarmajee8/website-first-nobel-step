export interface MembershipPlan {
  id: string;
  name: string;
  category: 'Entrepreneur' | 'Student' | 'Professional' | 'Internship' | 'Package';
  description: string;
  features: string[];
  isPopular?: boolean;
  price?: string;
  originalPrice?: string;
}

export interface MembershipApplication {
  planId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  cnic?: string;
  institute?: string;
  degree?: string;
  businessName?: string;
  industry?: string;
  experience?: string;
  targetCountry?: string;
  address?: string;
  university?: string;
  paymentMethod?: string;
  paymentProof?: string;
  otp?: string;
  otpHash?: string | null;
}

export type FormStep = 1 | 2 | 3 | 4 | 5;
