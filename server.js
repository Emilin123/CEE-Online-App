import http from 'node:http';
import crypto from 'node:crypto';
import { Store } from './store.js';

const store = new Store();
const port = Number(process.env.PORT || 8787);
const creatorHash = process.env.CEE_CREATOR_PIN_HASH || '';
const privateTokens = new Set();
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const read = req => new Promise((resolve, reject) => { let b=''; req.on('data', c => b += c); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { reject(new Error('invalid JSON')); } }); req.on('error', reject); });
const fail = (res, error) => json(res, error.message === 'capacity reached' ? 409 : 400, { error: error.message });
const privateOk = req => privateTokens.has(req.headers.authorization?.replace(/^Bearer\s+/, ''));
const sessionAuth = (req, body) => req.headers.authorization?.replace(/^Bearer\s+/, '') === body.sessionToken;
function verifyPin(pin) { if (!/^\d{6}$/.test(String(pin || '')) || !creatorHash) return false; const [salt, expected] = creatorHash.split(':'); if (!salt || !expected) return false; const actual = crypto.scryptSync(String(pin), salt, 32).toString('hex'); return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
const server = http.createServer(async (req, res) => { try {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, service: 'cee-online-control', capacity: { max: store.maxClients, active: store.activeCount() } });
  if (req.method === 'POST' && url.pathname === '/api/activate') { const result = store.activate(await read(req)); return json(res, 201, { ...result, sessionToken: crypto.randomBytes(32).toString('hex') }); }
  if (req.method === 'GET' && url.pathname.startsWith('/api/sessions/')) return json(res, 200, store.getSession(url.pathname.split('/').pop()));
  if (req.method === 'POST' && url.pathname.startsWith('/api/sessions/') && url.pathname.endsWith('/heartbeat')) { const b = await read(req); if (!sessionAuth(req,b)) return json(res,401,{error:'session authentication required'}); return json(res,200,store.heartbeat(url.pathname.split('/')[3],b.phoneId)); }
  if (req.method === 'POST' && url.pathname.startsWith('/api/sessions/') && url.pathname.endsWith('/pause')) { const b = await read(req); if (!sessionAuth(req,b)) return json(res,401,{error:'session authentication required'}); return json(res,200,store.pause(url.pathname.split('/')[3],b.phoneId)); }
  if (req.method === 'POST' && url.pathname.startsWith('/api/sessions/') && url.pathname.endsWith('/resume')) { const b = await read(req); if (!sessionAuth(req,b)) return json(res,401,{error:'session authentication required'}); return json(res,200,store.resume(url.pathname.split('/')[3],b.phoneId)); }
  if (req.method === 'POST' && url.pathname === '/api/private/unlock') { const { pin } = await read(req); if (!verifyPin(pin)) return json(res,401,{error:'private access denied'}); const token=crypto.randomBytes(32).toString('hex'); privateTokens.add(token); return json(res,200,{token}); }
  if (!privateOk(req)) return json(res,404,{error:'not found'});
  if (req.method === 'POST' && url.pathname === '/api/private/codes') return json(res,201,store.issueCode(await read(req)));
  if (req.method === 'POST' && url.pathname === '/api/private/provider') return json(res,200,store.setProviderState(await read(req)));
  if (req.method === 'GET' && url.pathname === '/api/private/overview') return json(res,200,{provider:store.provider,capacity:{max:store.maxClients,active:store.activeCount()}});
  return json(res,404,{error:'not found'});
} catch (error) { fail(res,error); } });
if (process.env.NODE_ENV !== 'test') server.listen(port, () => console.log(`CEE Online control server listening on ${port}`));
export { server, store, verifyPin };
