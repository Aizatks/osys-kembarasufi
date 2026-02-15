import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  getContentType,
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
  private initLocks: Map<string, boolean> = new Map();
  private phoneNumbers: Map<string, string> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    const authDir = path.join(process.cwd(), '.baileys_auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
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
    
    console.log(`[WA] Scheduling reconnect for ${staffId} in ${Math.round(delay/1000)}s (attempt ${attempts + 1})`);
    
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

  async getQR(staffId: string) {
    return this.qrCodes.get(staffId) || null;
  }

  async getPairingCode(staffId: string) {
    return this.pairingCodes.get(staffId) || null;
  }

  async getClient(staffId: string) {
    const existing = this.instances.get(staffId);
    if (existing && existing.ws?.readyState === 1) {
      return existing;
    }
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
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
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

  private async uploadMedia(staffId: string, msg: any): Promise<string | null> {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      if (!buffer || buffer.length === 0) return null;

      const contentType = getContentType(msg.message);
      const ext = this.getMediaExtension(contentType || '');
      const ts = Date.now();
      const filePath = `${staffId}/${ts}_${msg.key.id}${ext}`;

      const { error } = await supabaseAdmin.storage
        .from('whatsapp-media')
        .upload(filePath, buffer, {
          contentType: this.getMimeType(contentType || ''),
          upsert: true,
        });

      if (error) {
        console.error('[WA] Media upload error:', error.message);
        return null;
      }

      const { data } = supabaseAdmin.storage.from('whatsapp-media').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      console.error('[WA] Media download/upload error:', err?.message || err);
      return null;
    }
  }

  private getMediaExtension(contentType: string): string {
    if (contentType.includes('image')) return '.jpg';
    if (contentType.includes('video')) return '.mp4';
    if (contentType.includes('audio') || contentType.includes('ptt')) return '.ogg';
    if (contentType.includes('sticker')) return '.webp';
    if (contentType.includes('document')) return '.pdf';
    return '.bin';
  }

  private getMimeType(contentType: string): string {
    if (contentType.includes('image')) return 'image/jpeg';
    if (contentType.includes('video')) return 'video/mp4';
    if (contentType.includes('audio') || contentType.includes('ptt')) return 'audio/ogg';
    if (contentType.includes('sticker')) return 'image/webp';
    if (contentType.includes('document')) return 'application/pdf';
    return 'application/octet-stream';
  }

  private async saveMessage(staffId: string, remoteJid: string, fromMe: boolean, pushName: string, text: string, messageType: string, timestamp: string, mediaUrl?: string | null) {
    try {
      const { error } = await supabaseAdmin.from('whatsapp_messages').insert({
        staff_id: staffId,
        remote_jid: remoteJid,
        from_me: fromMe,
        push_name: pushName,
        text: text,
        message_type: messageType,
        timestamp: timestamp,
        contact_name: pushName,
        status: 'delivered',
        media_url: mediaUrl || null,
      });
      if (error) console.error('[WA] Supabase insert error:', error.message);
    } catch (err) {
      console.error('[WA] Error saving message:', err);
    }
  }

  private async fetchProfilePictures(staffId: string, sock: any, jids: string[]) {
    const toFetch = jids.slice(0, 200);
    let fetched = 0;
    for (const jid of toFetch) {
      try {
        const url = await sock.profilePictureUrl(jid, 'image');
        if (url) {
          await supabaseAdmin.from('whatsapp_contacts')
            .update({ picture_url: url })
            .eq('staff_id', staffId)
            .eq('jid', jid);
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
        const { data } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('remote_jid')
          .eq('staff_id', staffId)
          .like('remote_jid', '%@g.us')
          .range(offset, offset + pageSize - 1);
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
                staff_id: staffId,
                jid: gjid,
                name: meta.subject,
                notify: meta.subject,
              }, { onConflict: 'staff_id,jid' });
              console.log(`[WA] Group: ${gjid} -> ${meta.subject}`);
            }
          } catch (e: any) {
            console.log(`[WA] Group metadata failed for ${gjid}: ${e?.message || e}`);
          }
        await new Promise(r => setTimeout(r, 300));
      }
      console.log(`[WA] Group metadata sync done for ${staffId}`);
    } catch (err) {
      console.error('[WA] Group metadata sync error:', err);
    }
  }

  private async syncContactsFromStore(staffId: string, sock: any) {
    try {
      if (!sock.store?.contacts) return;
      const contacts = Object.values(sock.store.contacts) as any[];
      console.log(`[WA] Syncing ${contacts.length} contacts from store for ${staffId}`);
      const batch = [];
      for (const c of contacts) {
        if (!c.id || c.id === 'status@broadcast') continue;
        batch.push({
          staff_id: staffId,
          jid: c.id,
          name: c.name || c.verifiedName || null,
          notify: c.notify || null,
        });
      }
      if (batch.length > 0) {
        for (let i = 0; i < batch.length; i += 100) {
          await supabaseAdmin.from('whatsapp_contacts').upsert(batch.slice(i, i + 100), {
            onConflict: 'staff_id,jid',
          });
        }
        console.log(`[WA] Saved ${batch.length} contacts from store`);
      }
    } catch (err) {
      console.error('[WA] Store contacts sync error:', err);
    }
  }

  private extractText(msg: any): string {
    const m = msg.message;
    if (!m) return '';
    return m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      (m.documentMessage ? `[Dokumen] ${m.documentMessage.fileName || ''}`.trim() : '') ||
      (m.audioMessage || m.pttMessage ? '[Audio]' : '') ||
      (m.stickerMessage ? '[Sticker]' : '') ||
      (m.contactMessage ? '[Kenalan]' : '') ||
      (m.locationMessage ? '[Lokasi]' : '') ||
      (m.imageMessage ? '[Gambar]' : '') ||
      (m.videoMessage ? '[Video]' : '') ||
      '[Media]';
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
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      this.statuses.set(staffId, 'connecting');

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      browser: ['KembaraSufi', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 3000,
      qrTimeout: 60000,
      syncFullHistory: true,
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
          await supabaseAdmin
            .from('whatsapp_sessions')
            .upsert({
              staff_id: staffId,
              data: creds,
              phone_number: phoneNumber,
              status: this.statuses.get(staffId) || 'unknown',
              updated_at: new Date().toISOString()
            }, { onConflict: 'staff_id' });
        } catch (err) {
          console.error('[WA] Error syncing creds:', err);
        }
      });

      sock.ev.on('contacts.upsert', async (contacts) => {
        console.log(`[WA] Contacts upsert: ${contacts.length} contacts for ${staffId}`);
        const batch = [];
        for (const c of contacts) {
          if (!c.id || c.id === 'status@broadcast') continue;
          batch.push({
            staff_id: staffId,
            jid: c.id,
            name: c.name || c.verifiedName || null,
            notify: c.notify || null,
          });
        }
        if (batch.length > 0) {
          for (let i = 0; i < batch.length; i += 100) {
            await supabaseAdmin.from('whatsapp_contacts').upsert(batch.slice(i, i + 100), {
              onConflict: 'staff_id,jid',
            });
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
            await supabaseAdmin.from('whatsapp_contacts')
              .update(update)
              .eq('staff_id', staffId)
              .eq('jid', c.id);
          }
        }
      });

      sock.ev.on('groups.upsert', async (groups) => {
        for (const g of groups) {
          await supabaseAdmin.from('whatsapp_contacts').upsert({
            staff_id: staffId,
            jid: g.id,
            name: g.subject || null,
            notify: g.subject || null,
          }, { onConflict: 'staff_id,jid' });
        }
      });

      sock.ev.on('groups.update', async (groups) => {
        for (const g of groups) {
          if (g.subject) {
            await supabaseAdmin.from('whatsapp_contacts')
              .update({ name: g.subject, notify: g.subject })
              .eq('staff_id', staffId)
              .eq('jid', g.id);
          }
        }
      });

      sock.ev.on('messaging-history.set', async ({ chats, contacts, messages: histMsgs, isLatest }) => {
        console.log(`[WA] History sync for ${staffId}: ${histMsgs?.length || 0} messages, ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, isLatest=${isLatest}`);
        
        if (contacts && contacts.length > 0) {
          const contactBatch = [];
          for (const c of contacts) {
            if (!c.id || c.id === 'status@broadcast') continue;
            contactBatch.push({
              staff_id: staffId,
              jid: c.id,
              name: c.name || c.verifiedName || null,
              notify: c.notify || null,
            });
          }
          if (contactBatch.length > 0) {
            for (let i = 0; i < contactBatch.length; i += 100) {
              await supabaseAdmin.from('whatsapp_contacts').upsert(contactBatch.slice(i, i + 100), {
                onConflict: 'staff_id,jid',
              });
            }
            console.log(`[WA] Saved ${contactBatch.length} contacts from history`);
          }
        }

        if (chats && chats.length > 0) {
          const groupChats = chats.filter(c => c.id?.endsWith('@g.us'));
          for (const chat of groupChats) {
            if (chat.name) {
              await supabaseAdmin.from('whatsapp_contacts').upsert({
                staff_id: staffId,
                jid: chat.id,
                name: chat.name,
                notify: chat.name,
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

            const ts = msg.messageTimestamp
              ? new Date(Number(msg.messageTimestamp) * 1000)
              : new Date();
            if (ts < threeMonthsAgo) continue;

            const text = this.extractText(msg);
            if (!text) continue;
            
            const fromMe = msg.key?.fromMe || false;
            const pushName = msg.pushName || '';

            batch.push({
              staff_id: staffId,
              remote_jid: remoteJid,
              from_me: fromMe,
              push_name: pushName,
              text: text,
              message_type: this.getMessageType(msg),
              timestamp: ts.toISOString(),
              contact_name: pushName,
              status: 'synced',
            });
          }

          if (batch.length > 0) {
            for (let i = 0; i < batch.length; i += 100) {
              const chunk = batch.slice(i, i + 100);
              const { error } = await supabaseAdmin.from('whatsapp_messages').upsert(chunk, {
                onConflict: 'staff_id,remote_jid,timestamp',
                ignoreDuplicates: true,
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

          const ts = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
            : new Date().toISOString();

          let mediaUrl: string | null = null;
          if (this.hasDownloadableMedia(msg)) {
            mediaUrl = await this.uploadMedia(staffId, msg);
          }

          await this.saveMessage(staffId, remoteJid, fromMe, pushName, text, this.getMessageType(msg), ts, mediaUrl);

          if (pushName && !/^\d+$/.test(pushName) && pushName.length >= 2) {
            const contactJid = fromMe ? remoteJid : (msg.key?.participant || remoteJid);
            if (contactJid && contactJid.includes('@s.whatsapp.net')) {
              await supabaseAdmin.from('whatsapp_contacts').upsert({
                staff_id: staffId,
                jid: contactJid,
                notify: pushName,
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
            staff_id: staffId, 
            status: 'connected', 
            qr_code: null, 
            pairing_code: null, 
            phone_number: phoneNumber,
            updated_at: new Date().toISOString()
          }, { onConflict: 'staff_id' });

          this.syncContactsFromStore(staffId, sock);
          this.syncGroupsMetadata(staffId, sock);
          
          setTimeout(async () => {
            const { data: contacts } = await supabaseAdmin
              .from('whatsapp_contacts')
              .select('jid')
              .eq('staff_id', staffId)
              .is('picture_url', null)
              .limit(200);
            const jidsToFetch = contacts?.map(c => c.jid) || [];
            if (jidsToFetch.length > 0) {
              this.fetchProfilePictures(staffId, sock, jidsToFetch);
            }
          }, 10000);
        }
      });

      return sock;
    } finally {
      this.initLocks.set(staffId, false);
    }
  }

  private async syncContactNamesFromGroupMessages(staffId: string) {
    try {
      const { data: groupMsgs } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('push_name, text')
        .eq('staff_id', staffId)
        .eq('from_me', false)
        .like('remote_jid', '%@g.us')
        .not('push_name', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (!groupMsgs) return;

      const senderMap = new Map<string, string>();
      for (const m of groupMsgs) {
        if (!m.push_name || /^\d+$/.test(m.push_name)) continue;
        if (m.push_name.includes('@') || m.push_name.length < 2) continue;
        if (!senderMap.has(m.push_name)) senderMap.set(m.push_name, m.push_name);
      }

      const { data: personalJids } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('remote_jid')
        .eq('staff_id', staffId)
        .like('remote_jid', '%@s.whatsapp.net')
        .limit(1000);

      if (!personalJids) return;

      const uniqueJids = [...new Set(personalJids.map(r => r.remote_jid))];
      const batch = [];
      for (const jid of uniqueJids) {
        const number = jid.replace('@s.whatsapp.net', '');
        batch.push({
          staff_id: staffId,
          jid: jid,
          name: null,
          notify: null,
        });
      }

      if (batch.length > 0) {
        for (let i = 0; i < batch.length; i += 100) {
          await supabaseAdmin.from('whatsapp_contacts').upsert(batch.slice(i, i + 100), {
            onConflict: 'staff_id,jid',
            ignoreDuplicates: true,
          });
        }
        console.log(`[WA] Ensured ${batch.length} personal contacts exist`);
      }
    } catch (err) {
      console.error('[WA] Contact names sync error:', err);
    }
  }

  async triggerSync(staffId: string) {
    const sock = this.instances.get(staffId);
    if (!sock) return false;
    await this.syncGroupsMetadata(staffId, sock);
    await this.syncContactsFromStore(staffId, sock);
    await this.syncContactNamesFromGroupMessages(staffId);

    const { data: contacts } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('jid')
      .eq('staff_id', staffId)
      .is('picture_url', null)
      .limit(200);
    const jidsToFetch = contacts?.map(c => c.jid) || [];
    if (jidsToFetch.length > 0) {
      this.fetchProfilePictures(staffId, sock, jidsToFetch);
    }
    return true;
  }

    async sendMessage(staffId: string, to: string, text: string) {
      const client = await this.getClient(staffId);
      const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
      return client.sendMessage(jid, { text });
    }

    async sendMessageToJid(staffId: string, jid: string, text: string) {
      const client = await this.getClient(staffId);
      return client.sendMessage(jid, { text });
    }

    getAllStatuses(): Map<string, string> {
      return new Map(this.statuses);
    }

    getReconnectInfo(staffId: string): { attempts: number; hasTimer: boolean } {
      return {
        attempts: this.reconnectAttempts.get(staffId) || 0,
        hasTimer: this.reconnectTimers.has(staffId),
      };
    }

    async syncContacts(staffId: string) {
      const sock = this.instances.get(staffId);
      if (!sock) return { synced: false, error: 'Not connected' };
      
      await this.syncContactsFromStore(staffId, sock);
      await this.syncGroupsMetadata(staffId, sock);
      await this.syncContactNamesFromGroupMessages(staffId);

      const { data: contacts } = await supabaseAdmin
        .from('whatsapp_contacts')
        .select('jid')
        .eq('staff_id', staffId)
        .is('picture_url', null)
        .limit(200);
      const jidsToFetch = contacts?.map(c => c.jid) || [];
      if (jidsToFetch.length > 0) {
        this.fetchProfilePictures(staffId, sock, jidsToFetch);
      }
      return { synced: true };
    }

    async getContactProfile(staffId: string, jid: string) {
      const sock = this.instances.get(staffId);
      let pictureUrl: string | null = null;
      let status: string | null = null;

      if (sock) {
        try { pictureUrl = await sock.profilePictureUrl(jid, 'image'); } catch {}
        try {
          const s = await sock.fetchStatus(jid);
          status = s?.status || null;
        } catch {}
      }

      const { data: contact } = await supabaseAdmin
        .from('whatsapp_contacts')
        .select('*')
        .eq('staff_id', staffId)
        .eq('jid', jid)
        .maybeSingle();

      if (pictureUrl && contact) {
        await supabaseAdmin.from('whatsapp_contacts')
          .update({ picture_url: pictureUrl })
          .eq('staff_id', staffId)
          .eq('jid', jid);
      }

      const { data: sharedGroups } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('remote_jid')
        .eq('staff_id', staffId)
        .like('remote_jid', '%@g.us')
        .limit(5000);

      const groupJids = [...new Set((sharedGroups || []).map(m => m.remote_jid))];
      const groups: { jid: string; name: string }[] = [];
      
      if (sock && groupJids.length > 0) {
        for (const gjid of groupJids.slice(0, 50)) {
          try {
            const meta = await sock.groupMetadata(gjid);
            const isMember = meta?.participants?.some((p: any) => p.id === jid);
            if (isMember) {
              groups.push({ jid: gjid, name: meta.subject || gjid });
            }
          } catch {}
        }
      }

      const { count: mediaCount } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staffId)
        .eq('remote_jid', jid)
        .in('message_type', ['image', 'video', 'document']);

      const { data: recentMedia } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id, media_url, message_type, timestamp')
        .eq('staff_id', staffId)
        .eq('remote_jid', jid)
        .in('message_type', ['image', 'video'])
        .not('media_url', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(12);

      return {
        jid,
        name: contact?.name || contact?.notify || null,
        notify: contact?.notify || null,
        picture_url: pictureUrl || contact?.picture_url || null,
        status,
        phone: jid.replace('@s.whatsapp.net', ''),
        groups,
        media_count: mediaCount || 0,
        recent_media: recentMedia || [],
      };
    }
}

const globalForWA = globalThis as unknown as { whatsappManager: WhatsAppManager };
export const whatsappManager = globalForWA.whatsappManager || new WhatsAppManager();
if (process.env.NODE_ENV !== 'production') globalForWA.whatsappManager = whatsappManager;
