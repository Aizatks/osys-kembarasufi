import { supabase } from './supabase';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'create_quotation'
  | 'update_quotation'
  | 'view_quotation'
  | 'create_customer'
  | 'update_customer'
  | 'impersonate_start'
  | 'impersonate_end'
  | 'approve_staff'
  | 'reject_staff'
  | 'change_role'
  | 'delete_staff'
  | 'view_dashboard'
  | 'view_staff_list'
  | 'view_activity_logs';

interface LogActivityParams {
  staffId: string;
  staffName: string;
  staffEmail: string;
  action: ActivityAction;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  impersonatedBy?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      staff_id: params.staffId,
      staff_name: params.staffName,
      staff_email: params.staffEmail,
      action: params.action,
      description: params.description,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      impersonated_by: params.impersonatedBy,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function getActionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    login: 'Log Masuk',
    logout: 'Log Keluar',
    register: 'Daftar Akaun',
    create_quotation: 'Buat Sebut Harga',
    update_quotation: 'Kemaskini Sebut Harga',
    view_quotation: 'Lihat Sebut Harga',
    create_customer: 'Tambah Pelanggan',
    update_customer: 'Kemaskini Pelanggan',
    impersonate_start: 'Mula Impersonate',
    impersonate_end: 'Tamat Impersonate',
    approve_staff: 'Luluskan Staff',
    reject_staff: 'Tolak Staff',
    change_role: 'Tukar Peranan',
    delete_staff: 'Padam Staff',
    view_dashboard: 'Lihat Dashboard',
    view_staff_list: 'Lihat Senarai Staff',
    view_activity_logs: 'Lihat Log Aktiviti',
  };
  return labels[action] || action;
}
