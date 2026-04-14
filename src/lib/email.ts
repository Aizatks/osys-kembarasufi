import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'OSYS Kembara Sufi <noreply@kembarasufi.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://osys.kembarasufi.com';

export async function sendEmail({ to, subject, html }: { to: string | string[]; subject: string; html: string }) {
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured — email skipped:', subject);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[Email] Exception:', err);
    return { success: false, error: err.message };
  }
}

export async function notifyNewRegistration(staffName: string, staffEmail: string) {
  const { supabaseAdmin } = await import('./supabase');
  const { data: admins } = await supabaseAdmin
    .from('staff')
    .select('email')
    .eq('role', 'superadmin')
    .eq('status', 'approved');

  if (!admins || admins.length === 0) return;

  const adminEmails = admins.map((a: { email: string }) => a.email);

  await sendEmail({
    to: adminEmails,
    subject: `[OSYS] Pendaftaran Baru: ${staffName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e293b; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="margin: 0;">Pendaftaran Baru</h2>
          <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">OSYS Kembara Sufi</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; color: #334155;">Seorang staff baru telah mendaftar:</p>
          <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px;"><strong>Nama:</strong> ${staffName}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${staffEmail}</p>
          </div>
          <p style="margin: 16px 0 0; color: #64748b; font-size: 14px;">
            Sila log masuk ke OSYS untuk meluluskan dan menetapkan peranan.
          </p>
          <a href="${APP_URL}" style="display: inline-block; margin-top: 16px; background: #3b82f6; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Buka OSYS
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(staffEmail: string, staffName: string, resetToken: string) {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: staffEmail,
    subject: '[OSYS] Reset Kata Laluan',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e293b; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="margin: 0;">Reset Kata Laluan</h2>
          <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">OSYS Kembara Sufi</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; color: #334155;">Hi ${staffName},</p>
          <p style="color: #334155;">Anda telah meminta untuk reset kata laluan. Klik butang di bawah untuk menetapkan kata laluan baru:</p>
          <a href="${resetLink}" style="display: inline-block; margin: 16px 0; background: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Reset Kata Laluan
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">
            Link ini akan tamat tempoh dalam <strong>1 jam</strong>. Jika anda tidak meminta reset ini, sila abaikan email ini.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Jika butang tidak berfungsi, salin URL ini: ${resetLink}</p>
        </div>
      </div>
    `,
  });
}
