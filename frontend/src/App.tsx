import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { startSyncLoop, onSync, syncNow, type SyncState } from './lib/sync';
import { db } from './data/db';
import Login from './screens/Login';
import Home from './screens/Home';
import Rifles from './screens/Rifles';
import Components from './screens/Components';
import Loads from './screens/Loads';
import SessionScreen from './screens/Session';
import StringDetail from './screens/StringDetail';
import Analytics from './screens/Analytics';

function SyncBadge() {
  const [s, setS] = useState<SyncState>({ status: 'idle', pending: 0 });
  useEffect(() => onSync(setS), []);
  const label = s.status === 'syncing' ? 'Syncing…' : s.status === 'offline' ? `Offline · ${s.pending} saved on phone` : s.status === 'error' ? 'Sync error — tap to retry' : s.pending ? `${s.pending} to sync` : 'Synced';
  return <button className={`sync ${s.status}`} title={s.error} onClick={() => syncNow()}>{label}</button>;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange(async (_e, s) => {
      // Different user on this phone? clear local cache so records never mix.
      const prev = (await db.meta.get('userId'))?.value;
      if (s && prev && prev !== s.user.id) { await Promise.all(db.tables.map((t) => t.clear())); }
      if (s) await db.meta.put({ key: 'userId', value: s.user.id });
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) startSyncLoop(); }, [session?.user.id]);
  if (session === undefined) return null;
  if (!session) return <Login />;
  return (
    <BrowserRouter>
      <header className="top"><NavLink to="/" className="brand">Load Ledger</NavLink><SyncBadge /></header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rifles" element={<Rifles />} />
          <Route path="/components" element={<Components />} />
          <Route path="/loads" element={<Loads />} />
          <Route path="/sessions/:id" element={<SessionScreen />} />
          <Route path="/strings/:id" element={<StringDetail />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
      <nav className="tabs">
        <NavLink to="/" end>Home</NavLink><NavLink to="/loads">Loads</NavLink><NavLink to="/analytics">Charts</NavLink>
        <button onClick={() => confirm('Sign out? Unsynced records stay on this phone.') && supabase.auth.signOut()}>Sign out</button>
      </nav>
    </BrowserRouter>
  );
}
