import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'in' | 'request' | 'up';
export default function Login() {
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    if (mode === 'request') {
      const { error } = await supabase.rpc('request_access', { p_email: email, p_name: name, p_reason: reason });
      return setMsg(error ? error.message : 'Request sent. You will hear back once it is approved; then come back and choose "Create account".');
    }
    const { error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) setMsg(/ACCESS_NOT_APPROVED|Database error saving new user/i.test(error.message) ? 'This email has not been approved yet. Request access first.' : error.message);
    else if (mode === 'up') setMsg('Check your email to confirm your account, then sign in.');
  };
  return (
    <div className="login">
      <h1>Load Ledger</h1>
      <p className="muted">Range data and load-development records. Access is by invitation during testing.</p>
      <div className="seg">
        {(['in', 'request', 'up'] as Mode[]).map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => { setMode(m); setMsg(''); }}>{m === 'in' ? 'Sign in' : m === 'request' ? 'Request access' : 'Create account'}</button>)}
      </div>
      <form className="form" onSubmit={submit}>
        {mode === 'request' && <label className="field"><span>Name</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label>}
        <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {mode === 'request'
          ? <label className="field"><span>How will you use Load Ledger? (optional)</span><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          : <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
        {mode === 'up' && <p className="muted small">Only approved emails can create an account.</p>}
        <button className="btn primary">{mode === 'in' ? 'Sign in' : mode === 'request' ? 'Send request' : 'Create account'}</button>
      </form>
      {msg && <p className="notice">{msg}</p>}
    </div>
  );
}
