import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    const { error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message); else if (mode === 'up') setMsg('Check your email to confirm your account, then sign in.');
  };
  return (
    <div className="login">
      <h1>Load Ledger</h1>
      <p className="muted">Range data and load-development records.</p>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn primary">{mode === 'in' ? 'Sign in' : 'Create account'}</button>
      </form>
      {msg && <p className="notice">{msg}</p>}
      <button className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
    </div>
  );
}
