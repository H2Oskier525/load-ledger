import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, alive, save, remove, type LoadRecipe } from '../data/db';
import { RecordForm, type Field } from '../lib/form';
import { useLotOptions, useRifleOptions } from '../lib/lookups';

export default function Loads() {
  const rows = alive(useLiveQuery(() => db.load_recipes.toArray()));
  const lots = useLotOptions();
  const rifles = useRifleOptions();
  const [edit, setEdit] = useState<Partial<LoadRecipe> | null>(null);
  const fields: Field[] = [
    { name: 'name', label: 'Recipe name', required: true, placeholder: 'e.g. H4350 ladder step 3' },
    { name: 'rifle_id', label: 'Rifle', type: 'select', options: rifles },
    { name: 'cartridge', label: 'Cartridge' },
    { name: 'bullet_lot_id', label: 'Bullet lot', type: 'select', options: lots.bullet },
    { name: 'powder_lot_id', label: 'Powder lot', type: 'select', options: lots.powder },
    { name: 'primer_lot_id', label: 'Primer lot', type: 'select', options: lots.primer },
    { name: 'case_lot_id', label: 'Case lot', type: 'select', options: lots.case },
    { name: 'powder_charge_grains', label: 'Powder charge (gr)', type: 'number' },
    { name: 'cartridge_overall_length_inches', label: 'COAL (in)', type: 'number' },
    { name: 'base_to_ogive_inches', label: 'Base to ogive (in)', type: 'number' },
    { name: 'bullet_jump_inches', label: 'Jump (in)', type: 'number' },
    { name: 'case_firing_count', label: 'Case firings', type: 'number' },
    { name: 'neck_tension_inches', label: 'Neck tension (in)', type: 'number' },
    { name: 'trim_length_inches', label: 'Trim length (in)', type: 'number' },
    { name: 'notes', label: 'Prep notes', type: 'textarea' },
  ];
  if (edit) return (
    <div>
      <h2>{edit.id ? 'Edit recipe' : 'New recipe'}</h2>
      <p className="notice small">Recordkeeping only. Always follow published component-manufacturer load data.</p>
      <RecordForm<LoadRecipe> fields={fields} initial={edit} onSubmit={async (v) => { await save('load_recipes', { ...edit, ...v }); setEdit(null); }} />
      <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
    </div>
  );
  return (
    <div className="stack">
      <div className="row"><h2>Load recipes</h2><button className="btn primary" onClick={() => setEdit({})}>Add</button></div>
      {rows.map((r) => (
        <div key={r.id} className="card row">
          <div onClick={() => setEdit(r)}><b>{r.name}</b><div className="muted">{[r.cartridge, r.powder_charge_grains && `${r.powder_charge_grains} gr`, r.cartridge_overall_length_inches && `COAL ${r.cartridge_overall_length_inches}`].filter(Boolean).join(' · ')}</div></div>
          <div className="chips"><button className="btn small" onClick={() => { const { id: _i, created_at: _c, updated_at: _u, _dirty, ...rest } = r; setEdit({ ...rest, name: `${r.name} (copy)` }); }}>Duplicate</button>
          <button className="btn small" onClick={() => confirm('Delete?') && remove('load_recipes', r.id)}>Delete</button></div>
        </div>
      ))}
    </div>
  );
}
