import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type Component } from '../data/db';
import { RecordForm, type Field } from '../lib/form';

const TYPES = ['bullet', 'powder', 'primer', 'case'] as const;
const fields: Field[] = [
  { name: 'type', label: 'Type', type: 'select', required: true, options: TYPES.map((t) => ({ value: t, label: t })) },
  { name: 'manufacturer', label: 'Manufacturer' },
  { name: 'product_name', label: 'Product', required: true },
  { name: 'caliber_or_size', label: 'Caliber / size' },
  { name: 'weight_grains', label: 'Weight (gr)', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Components() {
  const comps = alive(useLiveQuery(() => db.components.toArray()));
  const lots = alive(useLiveQuery(() => db.component_lots.toArray()));
  const [edit, setEdit] = useState<Partial<Component> | null>(null);
  const addLot = async (component_id: string) => {
    const lot_number = prompt('Lot number');
    if (lot_number) await save('component_lots', { component_id, lot_number });
  };
  if (edit) return <div><h2>{edit.id ? 'Edit component' : 'New component'}</h2><RecordForm<Component> fields={fields} initial={edit} onSubmit={async (v) => { await save('components', { ...edit, ...v }); setEdit(null); }} /><button className="btn" onClick={() => setEdit(null)}>Cancel</button></div>;
  return (
    <div className="stack">
      <div className="row"><h2>Components</h2><button className="btn primary" onClick={() => setEdit({})}>Add</button></div>
      {TYPES.map((t) => (
        <section key={t}>
          <h3 className="cap">{t}s</h3>
          {comps.filter((c) => c.type === t).map((c) => (
            <div key={c.id} className="card">
              <div className="row"><div onClick={() => setEdit(c)}><b>{c.manufacturer} {c.product_name}</b><div className="muted">{[c.caliber_or_size, c.weight_grains && `${c.weight_grains} gr`].filter(Boolean).join(' · ')}</div></div>
                <button className="btn small" onClick={() => confirm('Delete?') && remove('components', c.id)}>Delete</button></div>
              <div className="chips">{lots.filter((l) => l.component_id === c.id).map((l) => <span key={l.id} className="pill">Lot {l.lot_number}</span>)}<button className="pill add" onClick={() => addLot(c.id)}>+ lot</button></div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
