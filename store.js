import crypto from 'node:crypto';

export const MAX_CLIENTS = 100;

const now = () => Date.now();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export class Store {
  constructor({ maxClients = MAX_CLIENTS } = {}) {
    this.maxClients = maxClients;
    this.codes = new Map();
    this.sessions = new Map();
    this.provider = { enabled: false, connected: false, updatedAt: now() };
  }

  setProviderState({ enabled, connected }) {
    this.provider = { enabled: Boolean(enabled), connected: Boolean(connected), updatedAt: now() };
    return this.provider;
  }

  issueCode({ days }) {
    if (!Number.isInteger(days) || days < 1 || days > 7) throw new Error('days must be an integer from 1 to 7');
    const plain = `CEE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const code = { id: id('code'), value: plain, days, used: false, phoneId: null, createdAt: now(), activatedAt: null };
    this.codes.set(plain, code);
    return { ...code };
  }

  activeCount() {
    return [...this.sessions.values()].filter(s => s.status === 'active').length;
  }

  activate({ codeValue, phoneId }) {
    const code = this.codes.get(codeValue);
    if (!code) throw new Error('invalid code');
    if (code.used) throw new Error('code already used');
    if (!phoneId) throw new Error('phoneId is required');
    if (this.activeCount() >= this.maxClients) throw new Error('capacity reached');
    code.used = true; code.phoneId = phoneId; code.activatedAt = now();
    const session = { id: id('session'), codeId: code.id, phoneId, durationMs: code.days * 86400000, remainingMs: code.days * 86400000, status: 'active', lastTickAt: now(), createdAt: now() };
    this.sessions.set(session.id, session);
    return this.snapshot(session);
  }

  tick() {
    const at = now();
    for (const session of this.sessions.values()) {
      if (session.status !== 'active') continue;
      const elapsed = Math.max(0, at - session.lastTickAt);
      if (this.provider.enabled && this.provider.connected) session.remainingMs = Math.max(0, session.remainingMs - elapsed);
      session.lastTickAt = at;
      if (session.remainingMs === 0) session.status = 'expired';
    }
  }

  snapshot(session) {
    this.tick();
    return { ...session, remainingMs: session.remainingMs, provider: { ...this.provider }, capacity: { max: this.maxClients, active: this.activeCount() } };
  }

  getSession(sessionId) {
    this.tick();
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('session not found');
    return this.snapshot(session);
  }
}
