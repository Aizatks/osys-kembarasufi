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
  | 'revoke_staff'
  | 'reactivate_staff'
  | 'delete_staff'
  | 'reset_password'
  | 'change_password'
  | 'view_dashboard'
  | 'view_staff_list'
  | 'view_activity_logs'
  | 'view_sales_report'
  | 'view_lead_report'
  | 'view_marketing_report'
  | 'view_task_scores'
  | 'view_task_harian'
  | 'create_task_template'
  | 'update_task_template'
  | 'delete_task_template'
  | 'complete_task'
  | 'uncomplete_task'
  | 'upload_attachment'
  | 'delete_attachment'
  | 'generate_tasks'
  | 'create_custom_task'
  | 'update_custom_task'
  | 'delete_custom_task'
  | 'export_data'
  | 'import_data'
  | 'create_sales_report'
  | 'update_sales_report'
  | 'delete_sales_report'
  | 'create_lead'
  | 'update_lead'
  | 'update_rbac_permission'
  | 'view_breakdown';

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
    revoke_staff: 'Nyahaktif Staff',
    reactivate_staff: 'Aktifkan Semula Staff',
    delete_staff: 'Padam Staff',
    reset_password: 'Reset Kata Laluan',
    change_password: 'Tukar Kata Laluan',
    view_dashboard: 'Lihat Dashboard',
    view_staff_list: 'Lihat Senarai Staff',
    view_activity_logs: 'Lihat Log Aktiviti',
    view_sales_report: 'Lihat Laporan Jualan',
    view_lead_report: 'Lihat Laporan Lead',
    view_marketing_report: 'Lihat Laporan Marketing',
    view_task_scores: 'Lihat Skor Task',
    view_task_harian: 'Lihat Task Harian',
    create_task_template: 'Tambah Template Task',
    update_task_template: 'Kemaskini Template Task',
    delete_task_template: 'Padam Template Task',
    complete_task: 'Tanda Task Selesai',
    uncomplete_task: 'Batal Task Selesai',
    upload_attachment: 'Muat Naik Lampiran',
    delete_attachment: 'Padam Lampiran',
    generate_tasks: 'Jana Task',
    create_custom_task: 'Tambah Task Khas',
    update_custom_task: 'Kemaskini Task Khas',
    delete_custom_task: 'Padam Task Khas',
    export_data: 'Eksport Data',
    import_data: 'Import Data',
    create_sales_report: 'Tambah Laporan Jualan',
    update_sales_report: 'Kemaskini Laporan Jualan',
    delete_sales_report: 'Padam Laporan Jualan',
    create_lead: 'Tambah Lead',
    update_lead: 'Kemaskini Lead',
    update_rbac_permission: 'Kemaskini Kebenaran RBAC',
    view_breakdown: 'Lihat Breakdown Prestasi',
  };
  return labels[action] || action;
}
