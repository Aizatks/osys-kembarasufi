import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { supabaseAdmin } from './supabase';
import path from 'path';
import fs from 'fs';

class WhatsAppManager {
  private instances: Map<string, any> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private pairingCodes: Map<string, string> = new Map();
  private statuses: Map<string, string> = new Map();

  constructor() {
    const authDir = path.join(process.cwd(), '.baileys_auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
  }

  async getStatus(staffId: string) {
    return this.statuses.get(staffId) || 'disconnected';
  }

  async getQR(staffId: string) {
    return this.qrCodes.get(staffId) || null;
  }

  async getPairingCode(staffId: string) {
    return this.pairingCodes.get(staffId) || null;
  }

  async getClient(staffId: string) {
    if (this.instances.has(staffId)) {
      return this.instances.get(staffId);
    }
    return this.initialize(staffId);
  }

  async requestPairingCode(staffId: string, phoneNumber: string) {
    const sock = await this.getClient(staffId);
    const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
    this.pairingCodes.set(staffId, code);
    
    await supabaseAdmin
      .from('whatsapp_sessions')
      .upsert({
        staff_id: staffId,
        pairing_code: code,
        status: 'pairing',
        updated_at: new Date().toISOString()
      }, { onConflict: 'staff_id' });
      
    return code;
  }

  async initialize(staffId: string) {
    const sessionDir = path.join(process.cwd(), '.baileys_auth', staffId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Orchids', 'Chrome', '1.0.0'],
    });

    this.instances.set(staffId, sock);
    this.statuses.set(staffId, 'connecting');

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      try {
        const creds = JSON.parse(fs.readFileSync(path.join(sessionDir, 'creds.json'), 'utf-8'));
        await supabaseAdmin
          .from('whatsapp_sessions')
          .upsert({
            staff_id: staffId,
            data: creds,
            status: this.statuses.get(staffId) || 'unknown',
            updated_at: new Date().toISOString()
          }, { onConflict: 'staff_id' });
      } catch (err) {
        console.error('Error syncing creds:', err);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCodes.set(staffId, qr);
        this.statuses.set(staffId, 'qr_ready');
        await supabaseAdmin.from('whatsapp_sessions').upsert({
          staff_id: staffId, qr_code: qr, status: 'qr_ready', updated_at: new Date().toISOString()
        }, { onConflict: 'staff_id' });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.statuses.set(staffId, 'disconnected');
        this.qrCodes.delete(staffId);
        if (shouldReconnect) {
          this.initialize(staffId);
        } else {
          this.instances.delete(staffId);
          if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
          await supabaseAdmin.from('whatsapp_sessions').delete().eq('staff_id', staffId);
        }
      } else if (connection === 'open') {
        this.statuses.set(staffId, 'connected');
        this.qrCodes.delete(staffId);
        this.pairingCodes.delete(staffId);
        await supabaseAdmin.from('whatsapp_sessions').upsert({
          staff_id: staffId, status: 'connected', qr_code: null, pairing_code: null, updated_at: new Date().toISOString()
        }, { onConflict: 'staff_id' });
      }
    });

    return sock;
  }

  async sendMessage(staffId: string, to: string, text: string) {
    const client = await this.getClient(staffId);
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    return client.sendMessage(jid, { text });
  }
}

export const whatsappManager = new WhatsAppManager();
