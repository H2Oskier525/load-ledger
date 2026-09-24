import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type Rifle } from '../data/db';
import { RecordForm, type Field } from '../lib/form';

const fields: Field[] = [
  { name: 'name', label: 'Name', required: true, placeholder: 'e.g. 6.5 CM Bergara' },
  { name: 'manufacturer', label: 'Manufacturer' }, { name: 'model', label: 'Model' },
  { name: 'caliber', label: 'Caliber / cartridge' },
  { name: 'barrel_length_inches', label: 'Barrel length (in)', type: 'number' },
  { name: 'twist_rate', label: 'Twist rate', placeholder: '1:8' },
  { name: 'barrel_round_count', label: 'Barrel round count', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Rifles() {
  const rows = alive(useLiveQuery(() => db.rifles.toArray()));
  const [edit, setEdit] = useState<Partial<Rifle> | null>(null);
  if (edit) return <div><h2>{edit.id ? 'Edit rifle' : 'New rifle'}</h2><RecordForm<Rifle> fields={fields} initial={edit} onSubmit={async (v) => { await save('rifles', { ...edit, ...v }); setEdit(null); }} /><button className="btn" onClick={() => setEdit(null)}>Cancel</button></div>;
  return (
    <div className="stack">
      <div className="row"><h2>Rifles</h2><button className="btn primary" onClick={() => setEdit({})}>Add</button></div>
      {rows.map((r) => (
        <div key={r.id} className="card row">
          <div onClick={() => setEdit(r)}><b>{r.name}</b><div className="muted">{[r.caliber, r.twist_rate, r.barrel_length_inches && `${r.barrel_length_inches}"`].filter(Boolean).join(' · ')}</div></div>
          <button className="btn small" onClick={() => confirm('Delete this rifle?') && remove('rifles', r.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
