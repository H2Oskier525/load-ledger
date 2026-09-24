import { useState, type ReactNode } from 'react';

export type Field = { name: string; label: string; type?: 'text' | 'number' | 'date' | 'textarea' | 'select'; options?: { value: string; label: string }[]; required?: boolean; step?: string; placeholder?: string };

export function RecordForm<T extends Record<string, any>>({ fields, initial, onSubmit, submitLabel = 'Save', children }: { fields: Field[]; initial?: Partial<T>; onSubmit: (v: Partial<T>) => unknown; submitLabel?: string; children?: ReactNode }) {
  const [v, setV] = useState<Record<string, any>>(initial || {});
  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }));
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); await onSubmit(v as Partial<T>); }}>
      {fields.map((f) => (
        <label key={f.name} className="field">
          <span>{f.label}{f.required && ' *'}</span>
          {f.type === 'textarea' ? (
            <textarea value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} rows={3} />
          ) : f.type === 'select' ? (
            <select value={v[f.name] ?? ''} required={f.required} onChange={(e) => set(f.name, e.target.value || undefined)}>
              <option value="">—</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type || 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} step={f.step || (f.type === 'number' ? 'any' : undefined)} placeholder={f.placeholder} required={f.required} value={v[f.name] ?? ''}
              onChange={(e) => set(f.name, f.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)} />
          )}
        </label>
      ))}
      {children}
      <button className="btn primary" type="submit">{submitLabel}</button>
    </form>
  );
}
