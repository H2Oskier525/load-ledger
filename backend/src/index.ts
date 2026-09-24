import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SYNC_TABLES, isSyncTable } from './tables.js';
import { parseChronoCsv } from './chrono.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');

const app = express();
app.use(
  cors({
    origin: (origin, cb) => {
      // Native apps (Capacitor) send capacitor://localhost or http://localhost
      if (!origin || ORIGINS.includes(origin) || /^(capacitor|ionic):\/\/localhost$/.test(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      cb(new Error('Origin not allowed'));
    },
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }));

type AuthedReq = Request & { db: SupabaseClient; userId: string };

// Each request uses the caller's own token, so Supabase row-level security enforces data ownership.
async function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });
  (req as AuthedReq).db = db;
  (req as AuthedReq).userId = data.user.id;
  next();
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'load-ledger-api', time: new Date().toISOString() }));

// Push: client sends locally-saved records; upsert in FK-safe order. Last write wins by updated_at.
app.post('/api/sync/push', auth, async (req, res) => {
  const { db, userId } = req as AuthedReq;
  const changes: Record<string, any[]> = req.body?.changes || {};
  const results: Record<string, number> = {};
  for (const table of SYNC_TABLES) {
    const rows = changes[table];
    if (!rows?.length) continue;
    const clean = rows.map(({ _dirty, ...r }: any) => ({ ...r, user_id: userId }));
    const { error } = await db.from(table).upsert(clean, { onConflict: 'id' });
    if (error) return res.status(400).json({ error: `${table}: ${error.message}`, results });
    results[table] = clean.length;
  }
  for (const t of Object.keys(changes)) if (!isSyncTable(t)) return res.status(400).json({ error: `Unknown table ${t}` });
  res.json({ ok: true, results, serverTime: new Date().toISOString() });
});

// Pull: everything changed since the client's last sync cursor (includes soft-deletes).
app.get('/api/sync/pull', auth, async (req, res) => {
  const { db } = req as AuthedReq;
  const since = typeof req.query.since === 'string' ? req.query.since : '1970-01-01T00:00:00Z';
  const serverTime = new Date().toISOString();
  const out: Record<string, any[]> = {};
  for (const table of SYNC_TABLES) {
    const { data, error } = await db.from(table).select('*').gt('updated_at', since).order('updated_at').limit(5000);
    if (error) return res.status(400).json({ error: `${table}: ${error.message}` });
    out[table] = data || [];
  }
  res.json({ changes: out, serverTime });
});

app.post('/api/import/chronograph', auth, (req, res) => {
  try {
    const text = typeof req.body === 'string' ? req.body : req.body?.csv;
    if (!text) return res.status(400).json({ error: 'Send the CSV as text/csv or {"csv": "..."}' });
    res.json(parseChronoCsv(text));
  } catch (e: any) {
    res.status(422).json({ error: e.message });
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ error: err.message || 'Server error' }));

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Load Ledger API on :${port}`));
