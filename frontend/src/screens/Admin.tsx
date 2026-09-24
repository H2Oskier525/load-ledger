import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Req = { id: string; email: string; full_name?: string; reason?: string; status: 'pending' | 'approved' | 'denied'; created_at: string };
export default function Admin() {
  const [rows, setRows] = useState<Req[]>([]);
  const [err, setErr] = useState('');
  const load = async () => { const { data, error } = await supabase.from('access_requests').select('*').order('created_at', { ascending: false }); if (error) setErr(error.message); else setRows(data as Req[]); };
  useEffect(() => { load(); }, []);
  const decide = async (r: Req, status: Req['status']) => {
    const { error } = await supabase.from('access_requests').update({ status, decided_at: new Date().toISOString() }).eq('id', r.id);
    if (error) return setErr(error.message);
    load();
  };
  const invite = (r: Req) => `mailto:${r.email}?subject=${encodeURIComponent('Your Load Ledger access is approved')}&body=${encodeURIComponent(`Hi ${r.full_name || ''},\n\nYour Load Ledger access is approved. Go to ${window.location.origin}, choose "Create account", and sign up with this email address.\n\nJustin`)}`;
  return (
    <div className="stack">
      <h2>Access requests</h2>
      {err && <p className="notice">{err}</p>}
      {['pending', 'approved', 'denied'].map((s) => (
        <section key={s}>
          <h3 className="cap">{s}</h3>
          {rows.filter((r) => r.status === s).map((r) => (
            <div key={r.id} className="card">
              <b>{r.full_name || r.email}</b><div className="muted">{r.email} · {new Date(r.created_at).toLocaleDateString()}</div>
              {r.reason && <p className="muted">{r.reason}</p>}
              <div className="chips">
                {r.status !== 'approved' && <button className="btn small primary" onClick={() => decide(r, 'approved')}>Approve</button>}
                {r.status !== 'denied' && <button className="btn small" onClick={() => decide(r, 'denied')}>{r.status === 'approved' ? 'Revoke' : 'Deny'}</button>}
                {r.status === 'approved' && <a className="btn small" href={invite(r)}>Email approval</a>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
