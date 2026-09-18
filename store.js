import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MAX_CLIENTS = 100;
const now = () => Date.now();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const DATA_FILE = process.env.CEE_DATA_FILE || path.join(process.cwd(), 'cee-data.json');

export class Store {
  constructor({ maxClients = MAX_CLIENTS } = {}) {
    this.maxClients = maxClients;
    this.codes = new Map(); this.sessions = new Map();
    this.provider = { enabled: false, connected: false, updatedAt: now() };
    this.load();
  }
  load() { try { const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); this.codes = new Map(d.codes || []); this.sessions = new Map(d.sessions || []); this.provider = d.provider || this.provider; } catch {} }
  save() { const tmp = `${DATA_FILE}.tmp`; fs.writeFileSync(tmp, JSON.stringify({ codes: [...this.codes], sessions: [...this.sessions], provider: this.provider })); fs.renameSync(tmp, DATA_FILE); }
  setProviderState({ enabled, connected }) { this.provider = { enabled: Boolean(enabled), connected: Boolean(connected), updatedAt: now() }; this.save(); return this.provider; }
  issueCode({ days }) { if (!Number.isInteger(days) || days < 1 || days > 7) throw new Error('days must be an integer from 1 to 7'); const plain = `CEE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`; const code = { id: id('code'), value: plain, days, used: false, phoneId: null, createdAt: now(), activatedAt: null }; this.codes.set(plain, code); this.save(); return { ...code }; }
  activeCount() { return [...this.sessions.values()].filter(s => s.status === 'active').length; }
  activate({ codeValue, phoneId }) { const code = this.codes.get(codeValue); if (!code) throw new Error('invalid code'); if (code.used) throw new Error('code already used'); if (!phoneId) throw new Error('phoneId is required'); if (this.activeCount() >= this.maxClients) throw new Error('capacity reached'); code.used = true; code.phoneId = phoneId; code.activatedAt = now(); const session = { id: id('session'), codeId: code.id, phoneId, durationMs: code.days * 86400000, remainingMs: code.days * 86400000, status: 'active', lastTickAt: now(), lastHeartbeatAt: now(), createdAt: now() }; this.sessions.set(session.id, session); this.save(); return this.snapshot(session); }
  tick() { const at = now(); for (const s of this.sessions.values()) { if (s.status !== 'active') continue; const elapsed = Math.max(0, at - s.lastTickAt); if (this.provider.enabled && this.provider.connected) s.remainingMs = Math.max(0, s.remainingMs - elapsed); s.lastTickAt = at; if (s.remainingMs === 0) s.status = 'expired'; } this.save(); }
  snapshot(session) { this.tick(); return { ...session, provider: { ...this.provider }, capacity: { max: this.maxClients, active: this.activeCount() } }; }
  getSession(sessionId) { const s = this.sessions.get(sessionId); if (!s) throw new Error('session not found'); return this.snapshot(s); }
  heartbeat(sessionId, phoneId) { const s = this.sessions.get(sessionId); if (!s || s.phoneId !== phoneId) throw new Error('session not found'); if (s.status !== 'active') throw new Error('session not active'); s.lastHeartbeatAt = now(); this.save(); return this.snapshot(s); }
  pause(sessionId, phoneId) { const s = this.sessions.get(sessionId); if (!s || s.phoneId !== phoneId) throw new Error('session not found'); this.tick(); s.status = 'paused'; this.save(); return this.snapshot(s); }
  resume(sessionId, phoneId) { const s = this.sessions.get(sessionId); if (!s || s.phoneId !== phoneId) throw new Error('session not found'); if (s.status !== 'paused') throw new Error('session is not paused'); s.status = 'active'; s.lastTickAt = now(); this.save(); return this.snapshot(s); }
}
