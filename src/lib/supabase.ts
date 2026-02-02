import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use anon key by default for client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Use service key for admin operations on server-side
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

export interface Staff {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  package_name: string;
  travel_date: string;
  pax_adult: number;
  pax_cwb: number;
  pax_cwob: number;
  pax_infant: number;
  total_amount: number;
  breakdown: Record<string, number>;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  created_by: string;
  staff_name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
