import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  getContentType,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';

const PORT = parseInt(process.env.PORT || '3001');
const JWT_SECRET = process.env.JWT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '10mb' }));

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

const WHATSAPP_ALLOWED_ROLES = ['admin', 'superadmin', 'marketing', 'c-suite'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_REGEX = /^[0-9]{10,15}$/;

function verifyAuth(req: express.Request): JWTPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

async function requireAuth(req: express.Request, res: express.Response): Promise<JWTPayload | null> {
  const payload = verifyAuth(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const { data: staff } = await supabaseAdmin.from('staff').select('id, role, status').eq('id', payload.userId).single();
  if (!staff || staff.status !== 'approved') {
    res.status(403).json({ error: 'Account not approved' });
    return null;
  }
  if (!WHATSAPP_ALLOWED_ROLES.includes(staff.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }
  return payload;
}

function isValidUUID(id: string): boolean { return UUID_REGEX.test(id); }

class WhatsAppManager {
  private instances: Map<string, any> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private pairingCodes: Map<string, string> = new Map();
  private statuses: Map<string, string> = new Map();
  private initLocks: Map<string, boolean> = new Map();
  private phoneNumbers: Map<string, string> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    const authDir = path.join(process.cwd(), '.baileys_auth');
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
    this.startHealthCheck();
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(async () => {
      for (const [staffId, sock] of this.instances.entries()) {
        const status = this.statuses.get(staffId);
        if (status === 'connected') {
          try {
            const wsState = sock?.ws?.readyState;
            if (wsState !== undefined && wsState !== 1) {
              console.log(`[WA] Health check: ${staffId} WebSocket dead (state=${wsState}), reconnecting...`);
              this.statuses.set(staffId, 'reconnecting');
              this.scheduleReconnect(staffId);
            }
          } catch {}
        }
      }
    }, 30000);
  }

  private scheduleReconnect(staffId: string) {
    const existing = this.reconnectTimers.get(staffId);
    if (existing) clearTimeout(existing);
    const attempts = this.reconnectAttempts.get(staffId) || 0;
    const delay = Math.min(3000 * Math.pow(1.5, attempts), 60000);
    this.reconnectAttempts.set(staffId, attempts + 1);
    console.log(`[WA] Scheduling reconnect for ${staffId} in ${Math.round(delay / 1000)}s (attempt ${attempts + 1})`);
    supabaseAdmin.from('whatsapp_sessions').update({ status: 'reconnecting', updated_at: new Date().toISOString() }).eq('staff_id', staffId).then(() => {});
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(staffId);
      try {
        await this.initialize(staffId);
      } catch (err) {
        console.error(`[WA] Reconnect failed for ${staffId}:`, err);
        if ((this.reconnectAttempts.get(staffId) || 0) < 15) {
          this.scheduleReconnect(staffId);
        } else {
          console.log(`[WA] Max reconnect attempts reached for ${staffId}`);
          this.statuses.set(staffId, 'disconnected');
          this.reconnectAttempts.delete(staffId);
        }
      }
    }, delay);
    this.reconnectTimers.set(staffId, timer);
  }

  async getStatus(staffId: string) {
    const memStatus = this.statuses.get(staffId);
    if (memStatus) return memStatus;
    const sessionDir = path.join(process.cwd(), '.baileys_auth', staffId);
    const credsPath = path.join(sessionDir, 'creds.json');
    if (fs.existsSync(credsPath) && !this.initLocks.get(staffId)) {
      console.log(`[WA] Found saved creds for ${staffId}, auto-reconnecting...`);
      this.statuses.set(staffId, 'reconnecting');
      this.initialize(staffId).catch(err => {
        console.error('[WA] Auto-reconnect failed:', err);
        this.statuses.delete(staffId);
      });
      return 'reconnecting';
    }
    return 'disconnected';
  }

  async getQR(staffId: string) { return this.qrCodes.get(staffId) || null; }
  async getPairingCode(staffId: string) { return this.pairingCodes.get(staffId) || null; }

  async getClient(staffId: string) {
    const existing = this.instances.get(staffId);
    if (existing && existing.ws?.readyState === 1) return existing;
    return this.initialize(staffId);
  }

  async disconnect(staffId: string) {
    const sock = this.instances.get(staffId);
    if (sock) {
      try { sock.ev.removeAllListeners(); sock.end(undefined); } catch {}
      this.instances.delete(staffId);
    }
    this.qrCodes.delete(staffId);
    this.pairingCodes.delete(staffId);
    this.statuses.delete(staffId);
    this.initLocks.delete(staffId);
    const sessionDir = path.join(process.cwd(), '.baileys_auth', staffId);
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  async requestPairingCode(staffId: string, phoneNumber: string) {
    const sock = await this.getClient(staffId);
    const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
    this.pairingCodes.set(staffId, code);
    await supabaseAdmin.from('whatsapp_sessions').upsert({
      staff_id: staffId, pairing_code: code, status: 'pairing', updated_at: new Date().toISOString()
    }, { onConflict: 'staff_id' });
    return code;
  }

  private async uploadMedia(staffId: string, msg: any): Promise<string | null> {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      if (!buffer || buffer.length === 0) return null;
      const contentType = getContentType(msg.message);
      const ext = this.getMediaExtension(contentType || '');
      const ts = Date.now();
      const filePath = `${staffId}/${ts}_${msg.key.id}${ext}`;
      const { error } = await supabaseAdmin.storage.from('whatsapp-media').upload(filePath, buffer, {
        contentType: this.getMimeType(contentType || ''), upsert: true,
      });
      if (error) { console.error('[WA] Media upload error:', error.message); return null; }
      const { data } = supabaseAdmin.storage.from('whatsapp-media').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      console.error('[WA] Media download/upload error:', err?.message || err);
      return null;
    }
  }

  private getMediaExtension(ct: string): string {
    if (ct.includes('image')) return '.jpg';
    if (ct.includes('video')) return '.mp4';
    if (ct.includes('audio') || ct.includes('ptt')) return '.ogg';
    if (ct.includes('sticker')) return '.webp';
    if (ct.includes('document')) return '.pdf';
    return '.bin';
  }

  private getMimeType(ct: string): string {
    if (ct.includes('image')) return 'image/jpeg';
    if (ct.includes('video')) return 'video/mp4';
    if (ct.includes('audio') || ct.includes('ptt')) return 'audio/ogg';
    if (ct.includes('sticker')) return 'image/webp';
    if (ct.includes('document')) return 'application/pdf';
    return 'application/octet-stream';
  }

  private async saveMessage(staffId: string, remoteJid: string, fromMe: boolean, pushName: string, text: string, messageType: string, timestamp: string, mediaUrl?: string | null) {
    try {
      const { error } = await supabaseAdmin.from('whatsapp_messages').insert({
        staff_id: staffId, remote_jid: remoteJid, from_me: fromMe, push_name: pushName,
        text, message_type: messageType, timestamp, contact_name: pushName,
        status: 'delivered', media_url: mediaUrl || null,
      });
      if (error) console.error('[WA] Supabase insert error:', error.message);
    } catch (err) { console.error('[WA] Error saving message:', err); }
  }

  private async fetchProfilePictures(staffId: string, sock: any, jids: string[]) {
    const toFetch = jids.slice(0, 200);
    let fetched = 0;
    for (const jid of toFetch) {
      try {
        const url = await sock.profilePictureUrl(jid, 'image');
        if (url) {
          await supabaseAdmin.from('whatsapp_contacts').update({ picture_url: url }).eq('staff_id', staffId).eq('jid', jid);
          fetched++;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`[WA] Fetched ${fetched} profile pictures out of ${toFetch.length} for ${staffId}`);
  }

  private async syncGroupsMetadata(staffId: string, sock: any) {
    try {
      const allGroupJids = new Set<string>();
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabaseAdmin.from('whatsapp_messages').select('remote_jid').eq('staff_id', staffId).like('remote_jid', '%@g.us').range(offset, offset + pageSize - 1);
        if (!data || data.length === 0) break;
        for (const r of data) allGroupJids.add(r.remote_jid);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      const uniqueGroupJids = [...allGroupJids];
      console.log(`[WA] Fetching metadata for ${uniqueGroupJids.length} groups`);
      for (const gjid of uniqueGroupJids) {
        try {
          const meta = await sock.groupMetadata(gjid);
          if (meta?.subject) {
            await supabaseAdmin.from('whatsapp_contacts').upsert({
              staff_id: staffId, jid: gjid, name: meta.subject, notify: meta.subject,
            }, { onConflict: 'staff_id,jid' });
          }
        } catch {}
        await new Promise(r => setTimeout(r, 300));
      }
      console.log(`[WA] Group metadata sync done for ${staffId}`);
    } catch (err) { console.error('[WA] Group metadata sync error:', err); }
  }

  private async syncContactsFromStore(staffId: string, sock: any) {
    try {
      if (!sock.store?.contacts) return;
      const contacts = Object.values(sock.store.contacts) as any[];
      console.log(`[WA] Syncing ${contacts.length} contacts from store for ${staffId}`);
      const batch = [];
      for (const c of contacts) {
        if (!c.id || c.id === 'status@broadcast') continue;
        batch.push({ staff_id: staffId, jid: c.id, name: c.name || c.verifiedName || null, notify: c.notify || null });
      }
      if (batch.length > 0) {
        for (let i = 0; i < batch.length; i += 100) {
          await supabaseAdmin.from('whatsapp_contacts').upsert(batch.slice(i, i + 100), { onConflict: 'staff_id,jid' });
        }
        console.log(`[WA] Saved ${batch.length} contacts from store`);
      }
    } catch (err) { console.error('[WA] Store contacts sync error:', err); }
  }

  private extractText(msg: any): string {
    const m = msg.message;
    if (!m) return '';
    return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption ||
      (m.documentMessage ? `[Dokumen] ${m.documentMessage.fileName || ''}`.trim() : '') ||
      (m.audioMessage || m.pttMessage ? '[Audio]' : '') || (m.stickerMessage ? '[Sticker]' : '') ||
      (m.contactMessage ? '[Kenalan]' : '') || (m.locationMessage ? '[Lokasi]' : '') ||
      (m.imageMessage ? '[Gambar]' : '') || (m.videoMessage ? '[Video]' : '') || '[Media]';
  }

  private getMessageType(msg: any): string {
    const m = msg.message;
    if (!m) return 'unknown';
    if (m.conversation || m.extendedTextMessage) return 'text';
    if (m.imageMessage) return 'image';
    if (m.videoMessage) return 'video';
    if (m.documentMessage) return 'document';
    if (m.audioMessage || m.pttMessage) return 'audio';
    if (m.stickerMessage) return 'sticker';
    if (m.contactMessage) return 'contact';
    if (m.locationMessage) return 'location';
    return 'other';
  }

  private hasDownloadableMedia(msg: any): boolean {
    const m = msg.message;
    if (!m) return false;
    return !!(m.imageMessage || m.videoMessage || m.audioMessage || m.pttMessage || m.documentMessage || m.stickerMessage);
  }

  async initialize(staffId: string) {
    if (this.initLocks.get(staffId)) {
      const existing = this.instances.get(staffId);
      if (existing) return existing;
      await new Promise(r => setTimeout(r, 2000));
      return this.instances.get(staffId);
    }
    this.initLocks.set(staffId, true);
    try {
      const oldSock = this.instances.get(staffId);
      if (oldSock) {
        try { oldSock.ev.removeAllListeners(); oldSock.end(undefined); } catch {}
        this.instances.delete(staffId);
      }
      const sessionDir = path.join(process.cwd(), '.baileys_auth', staffId);
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();
      this.statuses.set(staffId, 'connecting');

      const sock = makeWASocket({
        version, auth: state, printQRInTerminal: true,
        browser: ['KembaraSufi', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000, keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 3000, qrTimeout: 60000, syncFullHistory: true,
      });
      this.instances.set(staffId, sock);

      sock.ev.on('creds.update', async () => {
        await saveCreds();
        try {
          const credsFile = path.join(sessionDir, 'creds.json');
          if (!fs.existsSync(credsFile)) return;
          const raw = fs.readFileSync(credsFile, 'utf-8');
          if (!raw || raw.length < 10) return;
          const creds = JSON.parse(raw);
          const phoneNumber = creds?.me?.id?.split(':')[0] || creds?.me?.id?.split('@')[0] || null;
          if (phoneNumber) this.phoneNumbers.set(staffId, phoneNumber);
          await supabaseAdmin.from('whatsapp_sessions').upsert({
            staff_id: staffId, data: creds, phone_number: phoneNumber,
            status: this.statuses.get(staffId) || 'unknown', updated_at: new Date().toISOString()
          }, { onConflict: 'staff_id' });
        } catch (err) { console.error('[WA] Error syncing creds:', err); }
      });

      sock.ev.on('contacts.upsert', async (contacts) => {
        console.log(`[WA] Contacts upsert: ${contacts.length} contacts for ${staffId}`);
        const batch = [];
        for (const c of contacts) {
          if (!c.id || c.id === 'status@broadcast') continue;
          batch.push({ staff_id: staffId, jid: c.id, name: c.name || c.verifiedName || null, notify: c.notify || null });
        }
        if (batch.length > 0) {
          for (let i = 0; i < batch.length; i += 100) {
            await supabaseAdmin.from('whatsapp_contacts').upsert(batch.slice(i, i + 100), { onConflict: 'staff_id,jid' });
          }
          console.log(`[WA] Saved ${batch.length} contacts for ${staffId}`);
        }
      });

      sock.ev.on('contacts.update', async (contacts) => {
        for (const c of contacts) {
          if (!c.id) continue;
          const update: any = {};
          if (c.notify) update.notify = c.notify;
          if ((c as any).name) update.name = (c as any).name;
          if (Object.keys(update).length > 0) {
            await supabaseAdmin.from('whatsapp_contacts').update(update).eq('staff_id', staffId).eq('jid', c.id);
          }
        }
      });

      sock.ev.on('groups.upsert', async (groups) => {
        for (const g of groups) {
          await supabaseAdmin.from('whatsapp_contacts').upsert({
            staff_id: staffId, jid: g.id, name: g.subject || null, notify: g.subject || null,
          }, { onConflict: 'staff_id,jid' });
        }
      });

      sock.ev.on('groups.update', async (groups) => {
        for (const g of groups) {
          if (g.subject) {
            await supabaseAdmin.from('whatsapp_contacts').update({ name: g.subject, notify: g.subject }).eq('staff_id', staffId).eq('jid', g.id);
          }
        }
      });

      sock.ev.on('messaging-history.set', async ({ chats, contacts, messages: histMsgs, isLatest }) => {
        console.log(`[WA] History sync for ${staffId}: ${histMsgs?.length || 0} messages, ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, isLatest=${isLatest}`);
        if (contacts && contacts.length > 0) {
          const contactBatch = [];
          for (const c of contacts) {
            if (!c.id || c.id === 'status@broadcast') continue;
            contactBatch.push({ staff_id: staffId, jid: c.id, name: c.name || c.verifiedName || null, notify: c.notify || null });
          }
          if (contactBatch.length > 0) {
            for (let i = 0; i < contactBatch.length; i += 100) {
              await supabaseAdmin.from('whatsapp_contacts').upsert(contactBatch.slice(i, i + 100), { onConflict: 'staff_id,jid' });
            }
            console.log(`[WA] Saved ${contactBatch.length} contacts from history`);
          }
        }
        if (chats && chats.length > 0) {
          const groupChats = chats.filter(c => c.id?.endsWith('@g.us'));
          for (const chat of groupChats) {
            if (chat.name) {
              await supabaseAdmin.from('whatsapp_contacts').upsert({
                staff_id: staffId, jid: chat.id, name: chat.name, notify: chat.name,
              }, { onConflict: 'staff_id,jid' });
            }
          }
        }
        if (histMsgs && histMsgs.length > 0) {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const batch = [];
          for (const msg of histMsgs) {
            const remoteJid = msg.key?.remoteJid || '';
            if (!remoteJid || remoteJid === 'status@broadcast') continue;
            const ts = msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000) : new Date();
            if (ts < threeMonthsAgo) continue;
            const text = this.extractText(msg);
            if (!text) continue;
            const fromMe = msg.key?.fromMe || false;
            const pushName = msg.pushName || '';
            batch.push({
              staff_id: staffId, remote_jid: remoteJid, from_me: fromMe, push_name: pushName,
              text, message_type: this.getMessageType(msg), timestamp: ts.toISOString(),
              contact_name: pushName, status: 'synced',
            });
          }
          if (batch.length > 0) {
            for (let i = 0; i < batch.length; i += 100) {
              const chunk = batch.slice(i, i + 100);
              const { error } = await supabaseAdmin.from('whatsapp_messages').upsert(chunk, {
                onConflict: 'staff_id,remote_jid,timestamp', ignoreDuplicates: true,
              });
              if (error) {
                for (const row of chunk) {
                  await supabaseAdmin.from('whatsapp_messages').insert(row).then(({ error: e }) => {
                    if (e && !e.message.includes('duplicate')) console.error('[WA] Insert error:', e.message);
                  });
                }
              }
            }
            console.log(`[WA] Saved ${batch.length} history messages`);
          }
        }
      });

      sock.ev.on('messages.upsert', async ({ messages: msgs }) => {
        for (const msg of msgs) {
          if (!msg.message) continue;
          const remoteJid = msg.key.remoteJid || '';
          if (remoteJid === 'status@broadcast') continue;
          const fromMe = msg.key.fromMe || false;
          const pushName = msg.pushName || '';
          const text = this.extractText(msg);
          if (!text) continue;
          const ts = msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();
          let mediaUrl: string | null = null;
          if (this.hasDownloadableMedia(msg)) mediaUrl = await this.uploadMedia(staffId, msg);
          await this.saveMessage(staffId, remoteJid, fromMe, pushName, text, this.getMessageType(msg), ts, mediaUrl);
          if (pushName && !/^\d+$/.test(pushName) && pushName.length >= 2) {
            const contactJid = fromMe ? remoteJid : (msg.key?.participant || remoteJid);
            if (contactJid && contactJid.includes('@s.whatsapp.net')) {
              await supabaseAdmin.from('whatsapp_contacts').upsert({
                staff_id: staffId, jid: contactJid, notify: pushName,
              }, { onConflict: 'staff_id,jid' });
            }
          }
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
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isConflict = statusCode === 440;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isConflict;
          this.instances.delete(staffId);
          this.initLocks.delete(staffId);
          if (isConflict) {
            this.statuses.set(staffId, 'disconnected');
            this.qrCodes.delete(staffId);
          } else if (shouldReconnect) {
            this.qrCodes.delete(staffId);
            this.statuses.set(staffId, 'reconnecting');
            this.scheduleReconnect(staffId);
          } else {
            this.statuses.set(staffId, 'disconnected');
            this.qrCodes.delete(staffId);
            this.pairingCodes.delete(staffId);
            if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
            await supabaseAdmin.from('whatsapp_sessions').delete().eq('staff_id', staffId);
          }
        } else if (connection === 'open') {
          console.log(`[WA] Connected successfully for ${staffId}`);
          this.statuses.set(staffId, 'connected');
          this.qrCodes.delete(staffId);
          this.pairingCodes.delete(staffId);
          this.reconnectAttempts.delete(staffId);
          const existingTimer = this.reconnectTimers.get(staffId);
          if (existingTimer) { clearTimeout(existingTimer); this.reconnectTimers.delete(staffId); }
          const creds = state.creds;
          const phoneNumber = creds?.me?.id?.split(':')[0] || null;
          if (phoneNumber) this.phoneNumbers.set(staffId, phoneNumber);
          await supabaseAdmin.from('whatsapp_sessions').upsert({
            staff_id: staffId, status: 'connected', qr_code: null, pairing_code: null,
            phone_number: phoneNumber, updated_at: new Date().toISOString()
          }, { onConflict: 'staff_id' });
          this.syncContactsFromStore(staffId, sock);
          this.syncGroupsMetadata(staffId, sock);
          setTimeout(async () => {
            const { data: contacts } = await supabaseAdmin.from('whatsapp_contacts').select('jid').eq('staff_id', staffId).is('picture_url', null).limit(200);
            const jidsToFetch = contacts?.map(c => c.jid) || [];
            if (jidsToFetch.length > 0) this.fetchProfilePictures(staffId, sock, jidsToFetch);
          }, 10000);
        }
      });

      return sock;
    } finally {
      this.initLocks.set(staffId, false);
    }
  }

  private async syncContactNamesFromMessages(staffId: string) {
      try {
        const { data: msgs } = await supabaseAdmin.from('whatsapp_messages')
          .select('remote_jid, push_name, contact_name')
          .eq('staff_id', staffId)
          .eq('from_me', false)
          .like('remote_jid', '%@s.whatsapp.net')
          .not('push_name', 'is', null)
          .order('timestamp', { ascending: false })
          .limit(5000);
        if (!msgs) return;
        const nameMap = new Map<string, string>();
        for (const m of msgs) {
          if (!nameMap.has(m.remote_jid)) {
            const name = m.push_name || m.contact_name;
            if (name && !/^\d+$/.test(name) && name.length >= 2) {
              nameMap.set(m.remote_jid, name);
            }
          }
        }
        console.log(`[WA] Found ${nameMap.size} contact names from messages for ${staffId}`);
        const { data: existingContacts } = await supabaseAdmin.from('whatsapp_contacts')
          .select('jid, name, notify')
          .eq('staff_id', staffId)
          .in('jid', [...nameMap.keys()]);
        const needsUpdate: { staff_id: string; jid: string; notify: string }[] = [];
        const needsInsert: { staff_id: string; jid: string; notify: string }[] = [];
        const existingMap = new Map<string, any>();
        for (const c of existingContacts || []) existingMap.set(c.jid, c);
        for (const [jid, pushName] of nameMap) {
          const existing = existingMap.get(jid);
          if (!existing) {
            needsInsert.push({ staff_id: staffId, jid, notify: pushName });
          } else if (!existing.name && !existing.notify) {
            needsUpdate.push({ staff_id: staffId, jid, notify: pushName });
          }
        }
        if (needsInsert.length > 0) {
          for (let i = 0; i < needsInsert.length; i += 100) {
            await supabaseAdmin.from('whatsapp_contacts').upsert(needsInsert.slice(i, i + 100), { onConflict: 'staff_id,jid' });
          }
        }
        for (const item of needsUpdate) {
          await supabaseAdmin.from('whatsapp_contacts').update({ notify: item.notify }).eq('staff_id', staffId).eq('jid', item.jid);
        }
        console.log(`[WA] Updated ${needsUpdate.length} contacts, inserted ${needsInsert.length} new contacts from message names`);
      } catch (err) { console.error('[WA] Contact names sync error:', err); }
    }

  async triggerSync(staffId: string) {
    const sock = this.instances.get(staffId);
    if (!sock) return false;
    await this.syncGroupsMetadata(staffId, sock);
    await this.syncContactsFromStore(staffId, sock);
    await this.syncContactNamesFromMessages(staffId);
    const { data: contacts } = await supabaseAdmin.from('whatsapp_contacts').select('jid').eq('staff_id', staffId).is('picture_url', null).limit(200);
    const jidsToFetch = contacts?.map(c => c.jid) || [];
    if (jidsToFetch.length > 0) this.fetchProfilePictures(staffId, sock, jidsToFetch);
    return true;
  }

  async sendMessage(staffId: string, to: string, text: string) {
    const client = await this.getClient(staffId);
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    return client.sendMessage(jid, { text });
  }

  getAllStatuses(): Map<string, string> { return new Map(this.statuses); }

  getReconnectInfo(staffId: string) {
    return { attempts: this.reconnectAttempts.get(staffId) || 0, hasTimer: this.reconnectTimers.has(staffId) };
  }

  async syncContacts(staffId: string) {
    const sock = this.instances.get(staffId);
    if (!sock) return { synced: false, error: 'Not connected' };
    await this.syncContactsFromStore(staffId, sock);
      await this.syncGroupsMetadata(staffId, sock);
      await this.syncContactNamesFromMessages(staffId);
    const { data: contacts } = await supabaseAdmin.from('whatsapp_contacts').select('jid').eq('staff_id', staffId).is('picture_url', null).limit(200);
    const jidsToFetch = contacts?.map(c => c.jid) || [];
    if (jidsToFetch.length > 0) this.fetchProfilePictures(staffId, sock, jidsToFetch);
    return { synced: true };
  }

  async getContactProfile(staffId: string, jid: string) {
      const sock = this.instances.get(staffId);
      const isGroup = jid.includes('@g.us');
      let pictureUrl: string | null = null;
      let status: string | null = null;
      let groupMembers: { jid: string; name: string | null; phone: string; admin: string | null }[] = [];
      let groupSubject: string | null = null;

      if (sock) {
        try { pictureUrl = await sock.profilePictureUrl(jid, 'image'); } catch {}
        if (!isGroup) {
          try { const s = await sock.fetchStatus(jid); status = s?.status || null; } catch {}
        }
        if (isGroup) {
          try {
            const meta = await sock.groupMetadata(jid);
            groupSubject = meta?.subject || null;
            if (meta?.participants) {
              const participantJids = meta.participants.map((p: any) => p.id);
              const { data: contactNames } = await supabaseAdmin.from('whatsapp_contacts')
                .select('jid, name, notify')
                .eq('staff_id', staffId)
                .in('jid', participantJids);
              const nameMap = new Map<string, string>();
              for (const c of contactNames || []) {
                if (c.name || c.notify) nameMap.set(c.jid, c.name || c.notify);
              }
              groupMembers = meta.participants.map((p: any) => ({
                jid: p.id,
                name: nameMap.get(p.id) || null,
                phone: p.id.replace('@s.whatsapp.net', ''),
                admin: p.admin || null,
              }));
            }
          } catch (err) { console.error('[WA] Group metadata error:', err); }
        }
      }
      const { data: contact } = await supabaseAdmin.from('whatsapp_contacts').select('*').eq('staff_id', staffId).eq('jid', jid).maybeSingle();
      if (pictureUrl && contact) {
        await supabaseAdmin.from('whatsapp_contacts').update({ picture_url: pictureUrl }).eq('staff_id', staffId).eq('jid', jid);
      }
      const groups: { jid: string; name: string }[] = [];
      if (!isGroup) {
        const { data: sharedGroups } = await supabaseAdmin.from('whatsapp_messages').select('remote_jid').eq('staff_id', staffId).like('remote_jid', '%@g.us').limit(5000);
        const groupJids = [...new Set((sharedGroups || []).map(m => m.remote_jid))];
        if (sock && groupJids.length > 0) {
          for (const gjid of groupJids.slice(0, 50)) {
            try {
              const meta = await sock.groupMetadata(gjid);
              const isMember = meta?.participants?.some((p: any) => p.id === jid);
              if (isMember) groups.push({ jid: gjid, name: meta.subject || gjid });
            } catch {}
          }
        }
      }
      const { count: mediaCount } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('staff_id', staffId).eq('remote_jid', jid).in('message_type', ['image', 'video', 'document']);
      const { data: recentMedia } = await supabaseAdmin.from('whatsapp_messages').select('id, media_url, message_type, timestamp').eq('staff_id', staffId).eq('remote_jid', jid).in('message_type', ['image', 'video']).not('media_url', 'is', null).order('timestamp', { ascending: false }).limit(12);
      return {
        jid, name: groupSubject || contact?.name || contact?.notify || null, notify: contact?.notify || null,
        picture_url: pictureUrl || contact?.picture_url || null, status, phone: jid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        groups, group_members: groupMembers, media_count: mediaCount || 0, recent_media: recentMedia || [],
      };
    }

  async autoReconnectAll() {
    const { data: sessions } = await supabaseAdmin.from('whatsapp_sessions').select('staff_id').in('status', ['connected', 'reconnecting']);
    if (!sessions) return;
    console.log(`[WA] Auto-reconnecting ${sessions.length} sessions on startup...`);
    for (const s of sessions) {
      const sessionDir = path.join(process.cwd(), '.baileys_auth', s.staff_id);
      const credsPath = path.join(sessionDir, 'creds.json');
      if (fs.existsSync(credsPath)) {
        console.log(`[WA] Auto-reconnecting ${s.staff_id}...`);
        this.statuses.set(s.staff_id, 'reconnecting');
        this.initialize(s.staff_id).catch(err => {
          console.error(`[WA] Auto-reconnect failed for ${s.staff_id}:`, err);
        });
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
}

const manager = new WhatsAppManager();

// ============ ROUTES ============

app.get('/health', (_, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// --- Status ---
app.get('/api/whatsapp/status', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const staffId = req.query.staffId as string;
  if (!staffId || !isValidUUID(staffId)) return res.status(400).json({ error: 'Invalid staffId' });
  const status = await manager.getStatus(staffId);
  const qr = await manager.getQR(staffId);
  const pairingCode = await manager.getPairingCode(staffId);
  let qrDataUrl = null;
  if (qr) qrDataUrl = qr.startsWith('data:') ? qr : await QRCode.toDataURL(qr);
  res.set('Cache-Control', 'no-store').json({ status, qr: qrDataUrl, pairingCode });
});

// --- Connect ---
app.post('/api/whatsapp/connect', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  try {
    const { staffId } = req.body;
    if (!staffId || !isValidUUID(staffId)) return res.status(400).json({ error: 'Invalid staffId' });
    await manager.disconnect(staffId);
    await manager.getClient(staffId);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- Pair ---
app.post('/api/whatsapp/pair', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  try {
    const { staffId, phoneNumber } = req.body;
    if (!staffId || !isValidUUID(staffId)) return res.status(400).json({ error: 'Invalid staffId' });
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) return res.status(400).json({ error: 'Invalid phone format' });
    const code = await manager.requestPairingCode(staffId, cleanPhone);
    res.json({ code });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- Send Test ---
app.post('/api/whatsapp/send-test', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  try {
    const { staffId, number, message } = req.body;
    if (!staffId || !isValidUUID(staffId)) return res.status(400).json({ error: 'Invalid staffId' });
    const cleanPhone = (number || '').replace(/\D/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) return res.status(400).json({ error: 'Invalid phone' });
    if (!message || message.length > 4096) return res.status(400).json({ error: 'Invalid message' });
    await manager.sendMessage(staffId, cleanPhone, message);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- Send Reminders ---
app.post('/api/whatsapp/send-reminders', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  try {
    const { reminders, staffId } = req.body;
    if (!staffId || !isValidUUID(staffId)) return res.status(400).json({ error: 'Invalid staffId' });
    if (!reminders || !Array.isArray(reminders) || reminders.length > 100) return res.status(400).json({ error: 'Invalid reminders' });
    const results = [];
    for (const reminder of reminders) {
      try {
        const cleanPhone = (reminder.phone || '').replace(/\D/g, '');
        if (!PHONE_REGEX.test(cleanPhone)) { results.push({ id: reminder.id, status: 'failed', error: 'Invalid phone' }); continue; }
        if (!reminder.message || reminder.message.length > 4096) { results.push({ id: reminder.id, status: 'failed', error: 'Invalid message' }); continue; }
        await manager.sendMessage(staffId, cleanPhone, reminder.message);
        await supabaseAdmin.from('activity_logs').insert({ staff_id: staffId, action: 'SEND_WHATSAPP_REMINDER', details: { recipient: cleanPhone, customer_name: reminder.customer_name }, created_at: new Date().toISOString() });
        results.push({ id: reminder.id, status: 'sent' });
      } catch (err: any) { results.push({ id: reminder.id, status: 'failed', error: err.message }); }
    }
    res.json({ results });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- Messages ---
app.get('/api/whatsapp/messages', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const staffId = req.query.staffId as string;
  const jid = req.query.jid as string;
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  if (jid && staffId) {
    const { data: rawData, error } = await supabaseAdmin.from('whatsapp_messages').select('*').eq('staff_id', staffId).eq('remote_jid', jid).gte('timestamp', threeMonthsAgo.toISOString()).order('timestamp', { ascending: false }).limit(500);
    const data = (rawData || []).reverse();
    if (error) return res.status(500).json({ error: error.message });
    const { data: contact } = await supabaseAdmin.from('whatsapp_contacts').select('name, notify, picture_url').eq('staff_id', staffId).eq('jid', jid).maybeSingle();
    const contactName = contact?.name || contact?.notify || null;
    const contactNumber = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const messages = (data || []).map((msg: any) => ({
      id: msg.id, staff_id: msg.staff_id, jid: msg.remote_jid,
      sender_name: contactName || msg.push_name || msg.contact_name || contactNumber,
      sender_number: contactNumber, message_text: msg.text || '', message_type: msg.message_type || 'text',
      media_url: msg.media_url || null, is_from_me: msg.from_me, timestamp: msg.timestamp,
    }));
    return res.json({ messages, contact_name: contactName, picture_url: contact?.picture_url || null });
  }

  if (!staffId) return res.status(400).json({ error: 'staffId required' });

  const convMap: Record<string, any> = {};
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from('whatsapp_messages')
      .select('remote_jid, from_me, push_name, contact_name, text, message_type, timestamp')
      .eq('staff_id', staffId).gte('timestamp', threeMonthsAgo.toISOString())
      .order('timestamp', { ascending: false }).range(offset, offset + pageSize - 1);
    if (fallbackError) return res.status(500).json({ error: fallbackError.message });
    if (!fallbackData || fallbackData.length === 0) break;
    for (const msg of fallbackData) {
      const key = msg.remote_jid;
      if (!convMap[key]) {
        const contactNumber = key.replace('@s.whatsapp.net', '').replace('@g.us', '');
        convMap[key] = {
          staff_id: staffId, jid: key, contact_name: contactNumber, contact_number: contactNumber,
          picture_url: null, last_message: msg.text || '', last_message_type: msg.message_type || 'text',
          last_timestamp: msg.timestamp, last_from_me: msg.from_me, total_messages: 0, unread_count: 0,
        };
      }
      convMap[key].total_messages++;
      if (!msg.from_me) convMap[key].unread_count++;
      const cn = convMap[key].contact_number;
      if (convMap[key].contact_name === cn) {
        if (msg.push_name && msg.push_name !== cn) convMap[key].contact_name = msg.push_name;
        else if (msg.contact_name && msg.contact_name !== cn) convMap[key].contact_name = msg.contact_name;
      }
    }
    if (fallbackData.length < pageSize) break;
    offset += pageSize;
  }

  const contactJids = Object.keys(convMap);
  if (contactJids.length > 0) {
    for (let i = 0; i < contactJids.length; i += 100) {
      const chunk = contactJids.slice(i, i + 100);
      const { data: contacts } = await supabaseAdmin.from('whatsapp_contacts').select('jid, name, notify, picture_url').eq('staff_id', staffId).in('jid', chunk);
      for (const c of contacts || []) {
        if (convMap[c.jid]) {
          if (c.name || c.notify) convMap[c.jid].contact_name = c.name || c.notify;
          if (c.picture_url) convMap[c.jid].picture_url = c.picture_url;
        }
      }
    }
  }

  const conversations = Object.values(convMap).sort((a: any, b: any) => new Date(b.last_timestamp).getTime() - new Date(a.last_timestamp).getTime());
  res.json({ conversations });
});

// --- Contacts ---
app.get('/api/whatsapp/contacts', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const staffId = req.query.staffId as string;
  const jid = req.query.jid as string;
  if (!staffId) return res.status(400).json({ error: 'staffId required' });

  if (jid) {
    const profile = await manager.getContactProfile(staffId, jid);
    return res.json(profile);
  }

  const { data: contacts, count } = await supabaseAdmin.from('whatsapp_contacts').select('*', { count: 'exact' }).eq('staff_id', staffId).like('jid', '%@s.whatsapp.net').order('name', { ascending: true, nullsFirst: false }).limit(500);
  res.json({ contacts: contacts || [], total: count || 0 });
});

app.post('/api/whatsapp/contacts', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { staffId, action, jid, name } = req.body;
  if (!staffId) return res.status(400).json({ error: 'staffId required' });
  if (action === 'sync') {
    const result = await manager.syncContacts(staffId);
    return res.json(result);
  }
  if (action === 'save' && jid) {
    const { error } = await supabaseAdmin.from('whatsapp_contacts').upsert({ staff_id: staffId, jid, name: name || null }, { onConflict: 'staff_id,jid' });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ saved: true });
  }
  res.status(400).json({ error: 'Invalid action' });
});

// --- Monitoring ---
app.get('/api/whatsapp/monitoring', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { data: wasSessions } = await supabaseAdmin.from('whatsapp_sessions').select('*');
  const sessions = [];
  for (const s of wasSessions || []) {
    const { data: staff } = await supabaseAdmin.from('staff').select('name, phone_number').eq('id', s.staff_id).single();
    const { count } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('staff_id', s.staff_id);
    const liveStatus = await manager.getStatus(s.staff_id);
    const statusMap: Record<string, string> = { connected: 'CONNECTED', qr_ready: 'INITIALIZING', connecting: 'INITIALIZING', reconnecting: 'INITIALIZING' };
    sessions.push({
      id: s.staff_id, staff_id: s.staff_id, staff_name: staff?.name || 'Unknown',
      phone_number: staff?.phone_number || s.phone_number || '', status: statusMap[liveStatus] || 'DISCONNECTED',
      last_active: s.updated_at, msg_count: count || 0,
    });
  }
  res.json({ sessions });
});

app.post('/api/whatsapp/monitoring', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { staffId } = req.body;
  if (staffId) {
    const result = await manager.triggerSync(staffId);
    return res.json({ synced: result });
  }
  res.status(400).json({ error: 'staffId required' });
});

// --- Connections ---
app.get('/api/whatsapp/connections', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { data: allStaff } = await supabaseAdmin.from('staff').select('id, name, email, phone_number, role').order('name');
  const { data: sessions } = await supabaseAdmin.from('whatsapp_sessions').select('staff_id, phone_number, status, updated_at');
  const sessionMap = new Map<string, any>();
  for (const s of sessions || []) sessionMap.set(s.staff_id, s);

  const staffConnections = [];
  for (const staff of allStaff || []) {
    const session = sessionMap.get(staff.id);
    let liveStatus = 'none';
    let reconnectAttempts = 0;
    let hasReconnectTimer = false;
    try { liveStatus = await manager.getStatus(staff.id); } catch { liveStatus = session?.status || 'none'; }
    try { const info = manager.getReconnectInfo(staff.id); reconnectAttempts = info.attempts; hasReconnectTimer = info.hasTimer; } catch {}
    if (liveStatus === 'disconnected' && !session) liveStatus = 'none';
    const { count: msgCount } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('staff_id', staff.id);
    const { count: contactCount } = await supabaseAdmin.from('whatsapp_contacts').select('*', { count: 'exact', head: true }).eq('staff_id', staff.id);
    const { data: lastMsg } = await supabaseAdmin.from('whatsapp_messages').select('timestamp').eq('staff_id', staff.id).order('timestamp', { ascending: false }).limit(1);
    staffConnections.push({
      staff_id: staff.id, staff_name: staff.name, staff_email: staff.email, staff_role: staff.role,
      phone_number: session?.phone_number || staff.phone_number || null, wa_status: liveStatus,
      db_status: session?.status || 'none', last_session_update: session?.updated_at || null,
      last_message_at: lastMsg?.[0]?.timestamp || null, msg_count: msgCount || 0,
      contact_count: contactCount || 0, reconnect_attempts: reconnectAttempts,
      has_reconnect_timer: hasReconnectTimer, has_session: !!session,
    });
  }
  const connected = staffConnections.filter(s => s.wa_status === 'connected').length;
  const reconnecting = staffConnections.filter(s => s.wa_status === 'reconnecting').length;
  const disconnected = staffConnections.filter(s => s.has_session && s.wa_status !== 'connected' && s.wa_status !== 'reconnecting').length;
  const noSession = staffConnections.filter(s => !s.has_session).length;
  res.json({ staff: staffConnections, summary: { total: staffConnections.length, connected, reconnecting, disconnected, no_session: noSession } });
});

// --- Dashboard ---
app.get('/api/whatsapp/dashboard', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const { data: sessions } = await supabaseAdmin.from('whatsapp_sessions').select('staff_id, status, phone_number');
  const staffIds = (sessions || []).map(s => s.staff_id);
  const staffMap: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabaseAdmin.from('staff').select('id, name').in('id', staffIds);
    for (const s of staffData || []) staffMap[s.id] = s.name;
  }

  const { count: totalMsgCount } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('timestamp', startOfMonth);
  const { count: inboundCount } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('timestamp', startOfMonth).eq('from_me', false);
  const { count: outboundCount } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('timestamp', startOfMonth).eq('from_me', true);
  const { count: prevInbound } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('timestamp', prevMonthStart).lte('timestamp', prevMonthEnd).eq('from_me', false);
  const { count: prevOutbound } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).gte('timestamp', prevMonthStart).lte('timestamp', prevMonthEnd).eq('from_me', true);
  const { data: uniqueContactsData } = await supabaseAdmin.from('whatsapp_messages').select('remote_jid').gte('timestamp', startOfMonth).eq('from_me', false);
  const uniqueContacts = new Set((uniqueContactsData || []).map(m => m.remote_jid)).size;
  const { data: prevUniqueData } = await supabaseAdmin.from('whatsapp_messages').select('remote_jid').gte('timestamp', prevMonthStart).lte('timestamp', prevMonthEnd).eq('from_me', false);
  const prevUniqueContacts = new Set((prevUniqueData || []).map(m => m.remote_jid)).size;

  const staffMetrics = [];
  for (const sid of staffIds) {
    const { count: staffInbound } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('staff_id', sid).gte('timestamp', startOfMonth).eq('from_me', false);
    const { count: staffOutbound } = await supabaseAdmin.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('staff_id', sid).gte('timestamp', startOfMonth).eq('from_me', true);
    const { data: staffContactsData } = await supabaseAdmin.from('whatsapp_messages').select('remote_jid').eq('staff_id', sid).gte('timestamp', startOfMonth).eq('from_me', false);
    const staffUniqueContacts = new Set((staffContactsData || []).map(m => m.remote_jid)).size;
    const { data: responseTimes } = await supabaseAdmin.from('whatsapp_messages').select('timestamp, from_me, remote_jid').eq('staff_id', sid).gte('timestamp', startOfMonth).order('timestamp', { ascending: true }).limit(2000);
    let totalResponseTime = 0, responseCount = 0;
    const lastInbound: Record<string, string> = {};
    for (const msg of responseTimes || []) {
      if (!msg.from_me) { lastInbound[msg.remote_jid] = msg.timestamp; }
      else if (lastInbound[msg.remote_jid]) {
        const diff = new Date(msg.timestamp).getTime() - new Date(lastInbound[msg.remote_jid]).getTime();
        if (diff > 0 && diff < 86400000) { totalResponseTime += diff; responseCount++; }
        delete lastInbound[msg.remote_jid];
      }
    }
    staffMetrics.push({
      staff_id: sid, staff_name: staffMap[sid] || 'Unknown',
      status: (sessions || []).find(s => s.staff_id === sid)?.status || 'disconnected',
      inbound: staffInbound || 0, outbound: staffOutbound || 0, unique_contacts: staffUniqueContacts,
      avg_response_ms: responseCount > 0 ? totalResponseTime / responseCount : 0,
      unreplied: Object.keys(lastInbound).length,
    });
  }

  const { data: dailyData } = await supabaseAdmin.from('whatsapp_messages').select('timestamp, from_me').gte('timestamp', startOfMonth).order('timestamp', { ascending: true });
  const dailyMap: Record<string, { inbound: number; outbound: number }> = {};
  for (const msg of dailyData || []) {
    const day = msg.timestamp.split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { inbound: 0, outbound: 0 };
    if (msg.from_me) dailyMap[day].outbound++; else dailyMap[day].inbound++;
  }
  const dailyTrend = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, val]) => ({ date, ...val }));

  const { data: hourlyData } = await supabaseAdmin.from('whatsapp_messages').select('timestamp').gte('timestamp', startOfMonth);
  const hourlyMap: Record<number, number> = {};
  for (const msg of hourlyData || []) { const hour = new Date(msg.timestamp).getHours(); hourlyMap[hour] = (hourlyMap[hour] || 0) + 1; }
  const hourlyPattern = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${String(i).padStart(2, '0')}:00`, count: hourlyMap[i] || 0 }));
  const peakHour = hourlyPattern.reduce((max, h) => h.count > max.count ? h : max, hourlyPattern[0]);

  const calcChange = (c: number, p: number) => { if (p === 0) return c > 0 ? 100 : 0; return Math.round(((c - p) / p) * 100); };

  res.json({
    overview: {
      total_messages: totalMsgCount || 0, inbound: inboundCount || 0, outbound: outboundCount || 0,
      active_contacts: uniqueContacts, inbound_change: calcChange(inboundCount || 0, prevInbound || 0),
      outbound_change: calcChange(outboundCount || 0, prevOutbound || 0),
      contacts_change: calcChange(uniqueContacts, prevUniqueContacts),
      connected_staff: (sessions || []).filter(s => s.status === 'connected').length, total_staff: staffIds.length,
    },
    staff_metrics: staffMetrics.sort((a, b) => (b.inbound + b.outbound) - (a.inbound + a.outbound)),
    daily_trend: dailyTrend, hourly_pattern: hourlyPattern, peak_hour: peakHour,
  });
});

// --- Templates ---
app.get('/api/whatsapp/templates', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { data: templates, error } = await supabaseAdmin.from('whatsapp_templates').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ templates });
});

app.put('/api/whatsapp/templates', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { id, content } = req.body;
  if (!id || !content || content.length > 10000) return res.status(400).json({ error: 'Invalid input' });
  const { error } = await supabaseAdmin.from('whatsapp_templates').update({ content, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Rotator ---
app.get('/api/whatsapp/rotator', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { data: rotators, error } = await supabaseAdmin.from('whatsapp_rotators').select('*, whatsapp_rotator_numbers (*)').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rotators });
});

app.post('/api/whatsapp/rotator', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { name, slug, logic, pixel_id, tiktok_pixel_id } = req.body;
  if (!name || !slug || !/^[a-z0-9-]{1,50}$/.test(slug)) return res.status(400).json({ error: 'Invalid input' });
  const { data, error } = await supabaseAdmin.from('whatsapp_rotators').insert([{ name, slug, logic, pixel_id, tiktok_pixel_id }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rotator: data });
});

app.patch('/api/whatsapp/rotator', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { id, numbers } = req.body;
  if (!id || !isValidUUID(id) || !Array.isArray(numbers)) return res.status(400).json({ error: 'Invalid input' });
  await supabaseAdmin.from('whatsapp_rotator_numbers').delete().eq('rotator_id', id);
  const { data, error } = await supabaseAdmin.from('whatsapp_rotator_numbers').insert(numbers.map((n: any) => ({ ...n, rotator_id: id }))).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ numbers: data });
});

// --- Blasting ---
app.get('/api/whatsapp/blasting', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { data: campaigns } = await supabaseAdmin.from('whatsapp_blast_campaigns').select('*').order('created_at', { ascending: false });
  const enriched = [];
  for (const c of campaigns || []) {
    const { count: totalRecipients } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id);
    const { count: sentCount } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent');
    const { count: failedCount } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'failed');
    const { data: steps } = await supabaseAdmin.from('whatsapp_blast_steps').select('*').eq('campaign_id', c.id).order('step_order', { ascending: true });
    enriched.push({ ...c, total_recipients: totalRecipients || 0, sent_count: sentCount || 0, failed_count: failedCount || 0, steps: steps || [] });
  }
  res.json({ campaigns: enriched });
});

app.post('/api/whatsapp/blasting', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { name, description, instance_staff_id, scheduled_at, timezone, steps, recipients, min_delay_ms, max_delay_ms, daily_limit } = req.body;
  if (!name || !instance_staff_id) return res.status(400).json({ error: 'name and instance_staff_id required' });
  const { data: campaign, error } = await supabaseAdmin.from('whatsapp_blast_campaigns').insert({
    name, description: description || null, staff_id: user.userId, instance_staff_id,
    status: 'draft', scheduled_at: scheduled_at || null, timezone: timezone || 'Asia/Kuala_Lumpur',
    min_delay_ms: min_delay_ms || 3000, max_delay_ms: max_delay_ms || 8000, daily_limit: daily_limit || 500,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (steps?.length > 0) {
    await supabaseAdmin.from('whatsapp_blast_steps').insert(steps.map((s: any, idx: number) => ({
      campaign_id: campaign.id, step_order: idx + 1, message_type: s.message_type || 'text',
      message_text: s.message_text || '', media_url: s.media_url || null, delay_after_hours: s.delay_after_hours || 0,
    })));
  }
  if (recipients?.length > 0) {
    const rows = recipients.map((r: any) => ({ campaign_id: campaign.id, phone_number: r.phone_number || r.phone || r, name: r.name || null }));
    for (let i = 0; i < rows.length; i += 100) await supabaseAdmin.from('whatsapp_blast_recipients').insert(rows.slice(i, i + 100));
  }
  res.json({ campaign });
});

app.get('/api/whatsapp/blasting/:id', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { id } = req.params;
  const { data: campaign } = await supabaseAdmin.from('whatsapp_blast_campaigns').select('*').eq('id', id).single();
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  const { data: steps } = await supabaseAdmin.from('whatsapp_blast_steps').select('*').eq('campaign_id', id).order('step_order', { ascending: true });
  const { data: recipients } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*').eq('campaign_id', id).order('created_at', { ascending: true }).limit(1000);
  const { count: totalRecipients } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', id);
  const { count: sentCount } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'sent');
  const { count: failedCount } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'failed');
  res.json({ campaign, steps: steps || [], recipients: recipients || [], stats: { total: totalRecipients || 0, sent: sentCount || 0, failed: failedCount || 0, pending: (totalRecipients || 0) - (sentCount || 0) - (failedCount || 0) } });
});

app.patch('/api/whatsapp/blasting/:id', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { id } = req.params;
  const body = req.body;
  if (body.action === 'start') {
    await supabaseAdmin.from('whatsapp_blast_campaigns').update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
    startBlast(id).catch(err => console.error('[Blast] Error:', err));
    return res.json({ success: true, message: 'Campaign started' });
  }
  if (body.action === 'pause') {
    await supabaseAdmin.from('whatsapp_blast_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', id);
    return res.json({ success: true });
  }
  if (body.action === 'resume') {
    await supabaseAdmin.from('whatsapp_blast_campaigns').update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', id);
    startBlast(id).catch(err => console.error('[Blast] Error:', err));
    return res.json({ success: true });
  }
  const updates: any = { updated_at: new Date().toISOString() };
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.scheduled_at) updates.scheduled_at = body.scheduled_at;
  if (body.min_delay_ms) updates.min_delay_ms = body.min_delay_ms;
  if (body.max_delay_ms) updates.max_delay_ms = body.max_delay_ms;
  if (body.daily_limit) updates.daily_limit = body.daily_limit;
  await supabaseAdmin.from('whatsapp_blast_campaigns').update(updates).eq('id', id);
  if (body.steps) {
    await supabaseAdmin.from('whatsapp_blast_steps').delete().eq('campaign_id', id);
    await supabaseAdmin.from('whatsapp_blast_steps').insert(body.steps.map((s: any, idx: number) => ({
      campaign_id: id, step_order: idx + 1, message_type: s.message_type || 'text',
      message_text: s.message_text || '', media_url: s.media_url || null, delay_after_hours: s.delay_after_hours || 0,
    })));
  }
  if (body.recipients) {
    await supabaseAdmin.from('whatsapp_blast_recipients').delete().eq('campaign_id', id);
    const rows = body.recipients.map((r: any) => ({ campaign_id: id, phone_number: typeof r === 'string' ? r : (r.phone_number || r.phone), name: typeof r === 'string' ? null : (r.name || null) }));
    for (let i = 0; i < rows.length; i += 100) await supabaseAdmin.from('whatsapp_blast_recipients').insert(rows.slice(i, i + 100));
  }
  res.json({ success: true });
});

app.delete('/api/whatsapp/blasting/:id', async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  await supabaseAdmin.from('whatsapp_blast_campaigns').delete().eq('id', req.params.id);
  res.json({ success: true });
});

async function startBlast(campaignId: string) {
  const { data: campaign } = await supabaseAdmin.from('whatsapp_blast_campaigns').select('*').eq('id', campaignId).single();
  if (!campaign || campaign.status !== 'running') return;
  const { data: steps } = await supabaseAdmin.from('whatsapp_blast_steps').select('*').eq('campaign_id', campaignId).order('step_order', { ascending: true });
  if (!steps?.length) {
    await supabaseAdmin.from('whatsapp_blast_campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
    return;
  }
  const { data: pendingRecipients } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*').eq('campaign_id', campaignId).in('status', ['pending', 'sending']).order('created_at', { ascending: true }).limit(campaign.daily_limit || 500);
  if (!pendingRecipients?.length) {
    await supabaseAdmin.from('whatsapp_blast_campaigns').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', campaignId);
    return;
  }
  let sentToday = 0;
  const dailyLimit = campaign.daily_limit || 500;
  for (const recipient of pendingRecipients) {
    const { data: freshCampaign } = await supabaseAdmin.from('whatsapp_blast_campaigns').select('status').eq('id', campaignId).single();
    if (!freshCampaign || freshCampaign.status !== 'running') return;
    if (sentToday >= dailyLimit) return;
    await supabaseAdmin.from('whatsapp_blast_recipients').update({ status: 'sending' }).eq('id', recipient.id);
    const step = steps[recipient.current_step || 0] || steps[0];
    try {
      const jid = recipient.phone_number.replace(/\D/g, '');
      let messageText = (step.message_text || '').replace(/\{name\}/gi, recipient.name || '').replace(/\{phone\}/gi, recipient.phone_number || '');
      if (step.message_type === 'image' && step.media_url) {
        const sock = await manager.getClient(campaign.instance_staff_id);
        await sock.sendMessage(jid.includes('@') ? jid : `${jid}@s.whatsapp.net`, { image: { url: step.media_url }, caption: messageText || undefined });
      } else if (step.message_type === 'document' && step.media_url) {
        const sock = await manager.getClient(campaign.instance_staff_id);
        await sock.sendMessage(jid.includes('@') ? jid : `${jid}@s.whatsapp.net`, { document: { url: step.media_url }, caption: messageText || undefined, fileName: 'document.pdf' });
      } else {
        await manager.sendMessage(campaign.instance_staff_id, jid, messageText);
      }
      await supabaseAdmin.from('whatsapp_blast_recipients').update({ status: 'sent', current_step: (recipient.current_step || 0) + 1, last_sent_at: new Date().toISOString() }).eq('id', recipient.id);
      await supabaseAdmin.from('whatsapp_blast_logs').insert({ campaign_id: campaignId, recipient_id: recipient.id, step_id: step.id, status: 'sent' });
      sentToday++;
    } catch (err: any) {
      await supabaseAdmin.from('whatsapp_blast_recipients').update({ status: 'failed', error_message: err?.message || 'Unknown' }).eq('id', recipient.id);
      await supabaseAdmin.from('whatsapp_blast_logs').insert({ campaign_id: campaignId, recipient_id: recipient.id, step_id: step.id, status: 'failed', error_message: err?.message || 'Unknown' });
    }
    const delay = (campaign.min_delay_ms || 3000) + Math.random() * ((campaign.max_delay_ms || 8000) - (campaign.min_delay_ms || 3000));
    await new Promise(r => setTimeout(r, delay));
  }
  const { count: stillPending } = await supabaseAdmin.from('whatsapp_blast_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'pending');
  if (!stillPending) {
    await supabaseAdmin.from('whatsapp_blast_campaigns').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', campaignId);
  }
}

// ============ START ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WA Server] Running on port ${PORT}`);
  console.log(`[WA Server] Supabase: ${SUPABASE_URL}`);
  setTimeout(() => manager.autoReconnectAll(), 5000);
});
