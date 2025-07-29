/**
 * Types pour les modules de gestion des abonnements
 */

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  max_employees: number;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  stripe_price_id?: string;
  created_at?: string;
  updated_at?: string;
  display_order?: number;
  is_default?: boolean;
}

export interface FormData {
  id?: number;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  max_employees: number;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  stripe_price_id?: string;
  display_order?: number;
  is_default?: boolean;
}

export interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  duration_months?: string;
  max_employees?: string;
  features?: string;
  display_order?: string;
}

export interface CompanySubscription {
  id: number;
  company_id: number;
  company_name: string;
  subscription_plan_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
}
