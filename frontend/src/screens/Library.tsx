import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type LibraryNote } from '../data/db';
import { CARTRIDGES, searchCatalog, sameCartridge, type CatalogType } from '../catalog/catalog';
import { addFromCatalog, CartridgeInput } from '../ui/ComponentPicker';
import { useSettings } from '../lib/settings';

const SOURCES: Record<LibraryNote['source_type'], string> = { my_note: 'My note', saved_reference: 'Saved reference', manufacturer: 'Manufacturer-published', anecdotal: 'Anecdotal / field report' };
const DATA_LINKS: [string, string, string][] = [
  ['Hodgdon · IMR · Winchester', 'https://hodgdonreloading.com/rldc/', 'Reloading Data Center (powder)'],
  ['Vihtavuori', 'https://vihtavuori.com/reloading-data/reloading-data-tool/', 'Reloading data tool (powder)'],
  ['Alliant', 'https://www.alliantpowder.com/reloaders/default.aspx', "Reloader's Guide (powder)"],
  ['Norma', 'https://www.norma-ammunition.com/en-gb/reloading-data', 'Reloading data'],
  ['Hornady', 'https://www.hornady.com/support/load-data/', 'Load data (bullets)'],
  ['Sierra', 'https://sierrabullets.com/load-data/', 'Load data (bullets)'],
  ['Berger', 'https://bergerbullets.com/reloading-data/', 'Reloading data (bullets)'],
  ['Hornady BCs', 'https://www.hornady.com/bc', 'Published G1/G7 ballistic coefficients'],
];
type Tab = 'notes' | 'components' | 'cartridges' | 'data';

function NoteForm({ initial, onDone }: { initial: Partial<LibraryNote>; onDone: () => void }) {
  const [v, setV] = useState<Partial<LibraryNote>>({ source_type: 'my_note', ...initial });
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); await save('library_notes', v); onDone(); }}>
      <h2>{v.id ? 'Edit entry' : 'New library entry'}</h2>
      <label className="field"><span>Title *</span><input required value={v.title || ''} placeholder="e.g. H4350 temp-stable in 6.5 CM, Lapua brass" onChange={(e) => setV({ ...v, title: e.target.value })} /></label>
      <label className="field"><span>Source type</span><select value={v.source_type} onChange={(e) => setV({ ...v, source_type: e.target.value as any })}>{Object.entries(SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="field"><span>Cartridge</span><CartridgeInput value={v.cartridge} onChange={(c) => setV({ ...v, cartridge: c })} /></label>
      <label className="field"><span>Components mentioned</span><input value={v.component_ref || ''} placeholder="e.g. Berger 140 Hybrid, CCI BR-2" onChange={(e) => setV({ ...v, component_ref: e.target.value })} /></label>
      <label className="field"><span>Details</span><textarea rows={6} value={v.body || ''} onChange={(e) => setV({ ...v, body: e.target.value })} /></label>
      <label className="field"><span>Link (optional)</span><input type="url" value={v.source_url || ''} placeholder="https://" onChange={(e) => setV({ ...v, source_url: e.target.value })} /></label>
      <label className="field"><span>Tags</span><input value={v.tags || ''} placeholder="seating depth, pressure signs, brass" onChange={(e) => setV({ ...v, tags: e.target.value })} /></label>
      <p className="notice small">Anecdotal and forum information is not verified load data. Always check against published component-manufacturer data.</p>
      <button className="btn primary">Save</button><button type="button" className="btn" onClick={onDone}>Cancel</button>
    </form>
  );
}

export default function Library() {
  const { s } = useSettings();
  const libOn = s.libraryMode !== 'hidden';
  const [tab, setTab] = useState<Tab>('notes');
  const [q, setQ] = useState(''); const [cart, setCart] = useState<string>();
  const [ctype, setCtype] = useState<CatalogType>('bullet');
  const [edit, setEdit] = useState<Partial<LibraryNote> | null>(null);
  const [msg, setMsg] = useState('');
  const notes = alive(useLiveQuery(() => db.library_notes.toArray()));
  const loads = alive(useLiveQuery(() => db.load_recipes.toArray()));
  if (edit) return <NoteForm initial={edit} onDone={() => setEdit(null)} />;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = notes.filter((n) => (!cart || sameCartridge(n.cartridge, cart)) && words.every((w) => `${n.title} ${n.body} ${n.component_ref} ${n.tags}`.toLowerCase().includes(w))).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const dia = CARTRIDGES.find((c) => c.name === cart)?.bullet_dia;
  return (
    <div className="stack">
      <h2>Library</h2>
      <div className="seg small">{(['notes', 'components', 'cartridges', 'data'] as Tab[]).map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{{ notes: 'Notes & reports', components: 'Components', cartridges: 'Cartridges', data: 'Load data' }[t]}</button>)}</div>
      {!libOn && tab !== 'notes' && <p className="notice small">Reference library is hidden in Settings. Only your own notes are shown.</p>}

      {tab === 'notes' && <>
        <div className="grid2"><input placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} /><CartridgeInput value={cart} onChange={setCart} /></div>
        {cart && <button className="btn small" onClick={() => setCart(undefined)}>Clear cartridge filter</button>}
        <button className="btn primary" onClick={() => setEdit({ cartridge: cart })}>Add note or field report</button>
        {!shown.length && <p className="muted">Save what you learn: things you read, advice from other shooters, observations from your rifles. Each entry is labeled by where it came from.</p>}
        {shown.map((n) => (
          <div key={n.id} className="card">
            <div className="row"><b>{n.title}</b><span className={`src ${n.source_type}`}>{SOURCES[n.source_type]}</span></div>
            <div className="muted small">{[n.cartridge, n.component_ref, n.tags].filter(Boolean).join(' · ')}</div>
            {n.body && <p className="pre">{n.body}</p>}
            {n.source_url && <a className="link small" href={n.source_url} target="_blank" rel="noreferrer">Open source</a>}
            <div className="chips"><button className="btn small" onClick={() => setEdit(n)}>Edit</button><button className="btn small" onClick={() => (!s.confirmDeletes || confirm('Delete entry?')) && remove('library_notes', n.id)}>Delete</button></div>
          </div>
        ))}
      </>}

      {tab === 'components' && libOn && <>
        <div className="seg small">{(['bullet', 'powder', 'primer'] as CatalogType[]).map((t) => <button key={t} className={ctype === t ? 'on' : ''} onClick={() => setCtype(t)}>{t[0].toUpperCase() + t.slice(1)}s</button>)}</div>
        <div className="grid2"><input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />{ctype === 'bullet' && <CartridgeInput value={cart} onChange={setCart} />}</div>
        {msg && <p className="muted small">{msg}</p>}
        <div className="results tall">{searchCatalog(ctype, q, { diameter: ctype === 'bullet' ? dia : undefined }).map((i) => (
          <div key={i.key} className="result row"><span><b>{i.manufacturer}</b> {i.product_name}<span className="muted"> {[i.caliber_or_size, i.bullet_type].filter(Boolean).join(' · ')}</span></span>
            <button className="btn small" onClick={async () => { await addFromCatalog(i); setMsg(`Added ${i.manufacturer} ${i.product_name} to your components.`); }}>Add</button></div>))}</div>
        <p className="muted small">Starter library of common products (names and sizes only). Missing something? Quick add it from Components.</p>
      </>}

      {tab === 'cartridges' && libOn && <>
        <input placeholder="Search cartridges…" value={q} onChange={(e) => setQ(e.target.value)} />
        {[...CARTRIDGES, ...s.customCartridges].filter((c) => words.every((w) => c.name.toLowerCase().includes(w))).map((c) => {
          const nl = loads.filter((l) => sameCartridge(l.cartridge, c.name)).length, nn = notes.filter((n) => sameCartridge(n.cartridge, c.name)).length;
          return <div key={c.name} className="card row"><span><b>{c.name}</b><span className="muted"> {c.bullet_dia ? `${c.bullet_dia.toFixed(3)}" bullet` : ''}</span></span><span className="muted small">{nl} loads · {nn} notes</span><button className="btn small" onClick={() => { setCart(c.name); setQ(''); setTab('notes'); }}>Notes</button></div>;
        })}
      </>}

      {tab === 'data' && libOn && <>
        <p className="muted small">Published load data comes from the component makers. Open their official data, then record the load you choose in Build.</p>
        {DATA_LINKS.map(([m, url, d]) => <a key={url} className="card row" href={url} target="_blank" rel="noreferrer"><span><b>{m}</b><div className="muted small">{d}</div></span><span className="src manufacturer">Manufacturer</span></a>)}
        <button className="btn small" onClick={() => { setTab('notes'); setEdit({ source_type: 'manufacturer' }); }}>Save a manufacturer reference to my library</button>
      </>}
    </div>
  );
}
