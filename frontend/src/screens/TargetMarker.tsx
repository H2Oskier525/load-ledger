import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, save } from '../data/db';
import { measureGroup, pxPerInch, dist, type Pt, type TargetAnalysis } from '../lib/group';
import { moa, fmt } from '../lib/stats';
import { preparePhoto } from '../lib/image';

type Mode = 'scale' | 'holes';
const HIT = 28; // px on screen to select an existing mark

export default function TargetMarker() {
  const { id } = useParams();
  const nav = useNavigate();
  const f = useLiveQuery(() => db.firing_strings.get(id!), [id]);
  const photo = useLiveQuery(() => db.photos.get(id!), [id]);
  const [url, setUrl] = useState<string>();
  const [t, setT] = useState<TargetAnalysis>({ holes: [] });
  const [mode, setMode] = useState<Mode>('scale');
  const [zoom, setZoom] = useState(1);
  const [sel, setSel] = useState<{ kind: 'hole' | 'a' | 'b'; i?: number } | null>(null);
  const [pending, setPending] = useState<Pt | null>(null);
  const [inches, setInches] = useState('1');
  const imgRef = useRef<HTMLImageElement>(null);
  const loaded = useRef(false);
  const dragging = useRef(false);
  const [k, setK] = useState(1); // natural px → screen px, kept current on load/resize/zoom
  const measure = () => { const i = imgRef.current; if (i && i.naturalWidth && i.clientWidth) setK(i.clientWidth / i.naturalWidth); };
  useEffect(() => { const i = imgRef.current; if (!i) return; const ro = new ResizeObserver(measure); ro.observe(i); return () => ro.disconnect(); }, [url]);
  useEffect(measure, [zoom]);

  useEffect(() => { if (f && !loaded.current) { loaded.current = true; if (f.target_analysis) { setT(f.target_analysis); setMode(f.target_analysis.scale ? 'holes' : 'scale'); if (f.target_analysis.scale) setInches(String(f.target_analysis.scale.inches)); } } }, [f]);
  useEffect(() => { if (!photo) return; const u = URL.createObjectURL(photo.blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [photo]);

  if (!f) return <p>Loading…</p>;
  const img = imgRef.current;
  const toNat = (e: React.PointerEvent): Pt => { const r = img!.getBoundingClientRect(); const kk = img!.clientWidth / img!.naturalWidth; return { x: (e.clientX - r.left) / kk, y: (e.clientY - r.top) / kk }; };
  const near = (p: Pt, q?: Pt) => q && dist(p, q) * k < HIT;

  const onDown = (e: React.PointerEvent) => {
    if (!img || !img.naturalWidth) return;
    dragging.current = true;
    const p = toNat(e);
    if (mode === 'scale') {
      if (near(p, t.scale?.a)) return setSel({ kind: 'a' });
      if (near(p, t.scale?.b)) return setSel({ kind: 'b' });
      if (!pending && !t.scale) return setPending(p);
      if (pending) { setT({ ...t, scale: { a: pending, b: p, inches: Number(inches) || 1 } }); setPending(null); }
      return;
    }
    const i = t.holes.findIndex((h) => near(p, h));
    if (i >= 0) return setSel({ kind: 'hole', i });
    setT({ ...t, holes: [...t.holes, p] });
    setSel({ kind: 'hole', i: t.holes.length });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!sel || !img || !dragging.current) return;
    const p = toNat(e);
    if (sel.kind === 'hole') setT({ ...t, holes: t.holes.map((h, j) => (j === sel.i ? p : h)) });
    else if (t.scale) setT({ ...t, scale: { ...t.scale, [sel.kind]: p } });
  };
  const removeSelected = () => { if (sel?.kind === 'hole') { setT({ ...t, holes: t.holes.filter((_, j) => j !== sel.i) }); setSel(null); } };

  const g = measureGroup(t);
  const ppi = pxPerInch(t);
  const bulletPx = t.bullet_diameter_inches && ppi ? t.bullet_diameter_inches * ppi * k : 14;

  const apply = async () => {
    await save('firing_strings', { ...f, target_analysis: { ...t, image_w: img?.naturalWidth, image_h: img?.naturalHeight }, group_size_inches: g.ctc ? +g.ctc.toFixed(3) : f.group_size_inches, vertical_spread_inches: g.vertical ? +g.vertical.toFixed(3) : f.vertical_spread_inches, horizontal_spread_inches: g.horizontal ? +g.horizontal.toFixed(3) : f.horizontal_spread_inches });
    nav(`/strings/${f.id}`);
  };

  if (!url) return (
    <div className="stack"><h2>Measure target</h2><p className="muted">Take or choose a photo of the target, straight on and flat.</p>
      <label className="btn primary big">Take / choose photo<input hidden type="file" accept="image/*" capture="environment" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await db.photos.put({ id: f.id, blob: await preparePhoto(file), uploaded: 0 }); }} /></label>
      <button className="btn" onClick={() => nav(-1)}>Cancel</button></div>
  );

  return (
    <div className="stack">
      <div className="seg">
        <button className={mode === 'scale' ? 'on' : ''} onClick={() => { setMode('scale'); setSel(null); }}>1. Set scale</button>
        <button className={mode === 'holes' ? 'on' : ''} disabled={!t.scale} onClick={() => { setMode('holes'); setSel(null); }}>2. Mark holes</button>
      </div>
      {mode === 'scale' ? (
        <div className="stack">
          <p className="muted small">Tap two points a known distance apart (e.g. grid lines or a ruler on the target). Drag the dots to fine-tune.</p>
          <div className="grid2">
            <label className="field"><span>Distance between points (in)</span><input type="number" inputMode="decimal" step="any" value={inches} onChange={(e) => { setInches(e.target.value); if (t.scale) setT({ ...t, scale: { ...t.scale, inches: Number(e.target.value) || 0 } }); }} /></label>
            <label className="field"><span>Bullet diameter (in)</span><input type="number" inputMode="decimal" step="any" placeholder=".264" value={t.bullet_diameter_inches ?? ''} onChange={(e) => setT({ ...t, bullet_diameter_inches: e.target.value ? Number(e.target.value) : undefined })} /></label>
          </div>
          {t.scale && <button className="btn small" onClick={() => { setT({ ...t, scale: undefined }); setPending(null); }}>Reset scale points</button>}
        </div>
      ) : (
        <p className="muted small">Tap the center of each hole to add it. Tap a mark to select it, drag to move, or remove it.</p>
      )}
      <div className="row"><label className="muted small">Zoom</label><input type="range" min={1} max={4} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></div>
      <div className="target-wrap">
        <div className="target-canvas" style={{ width: `${zoom * 100}%` }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { dragging.current = false; if (mode === 'scale') setSel(null); }} onPointerLeave={() => { dragging.current = false; }}>
          <img ref={imgRef} src={url} alt="Target" draggable={false} onLoad={measure} />
          <svg className="overlay">
            {t.scale && <line x1={t.scale.a.x * k} y1={t.scale.a.y * k} x2={t.scale.b.x * k} y2={t.scale.b.y * k} className="scale-line" />}
            {[pending, t.scale?.a, t.scale?.b].filter(Boolean).map((p, i) => <circle key={`s${i}`} cx={p!.x * k} cy={p!.y * k} r={9} className="scale-pt" />)}
            {g.pair && t.holes.length > 1 && <line x1={t.holes[g.pair[0]].x * k} y1={t.holes[g.pair[0]].y * k} x2={t.holes[g.pair[1]].x * k} y2={t.holes[g.pair[1]].y * k} className="spread-line" />}
            {t.holes.map((h, i) => (
              <g key={i}>
                <circle cx={h.x * k} cy={h.y * k} r={bulletPx / 2} className={`hole ${sel?.kind === 'hole' && sel.i === i ? 'sel' : ''}`} />
                <circle cx={h.x * k} cy={h.y * k} r={2} className="hole-c" />
                <text x={h.x * k + bulletPx / 2 + 3} y={h.y * k - 3} className="hole-n">{i + 1}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      {mode === 'holes' && (
        <div className="chips">
          <button className="btn small" disabled={sel?.kind !== 'hole'} onClick={removeSelected}>Remove selected</button>
          <button className="btn small" disabled={!t.holes.length} onClick={() => { setT({ ...t, holes: t.holes.slice(0, -1) }); setSel(null); }}>Undo last</button>
          <button className="btn small" disabled={!t.holes.length} onClick={() => confirm('Clear all holes?') && setT({ ...t, holes: [] })}>Clear</button>
        </div>
      )}
      <div className="stats big">
        <span>{g.n} holes</span>
        <span>CTC {fmt(g.ctc, 3)}"</span>
        <span>{fmt(moa(g.ctc, f.target_distance_yards), 2)} MOA</span>
      </div>
      <div className="stats"><span>V {fmt(g.vertical, 3)}"</span><span>H {fmt(g.horizontal, 3)}"</span><span>Mean radius {fmt(g.meanRadius, 3)}"</span>{g.edge && <span>Edge-to-edge {fmt(g.edge, 3)}"</span>}<span>@ {f.target_distance_yards ?? '—'} yd</span></div>
      {!f.target_distance_yards && <p className="notice small">Set the target distance on the string to get MOA.</p>}
      <button className="btn primary big" disabled={!g.ctc} onClick={apply}>Use these measurements</button>
      <div className="chips">
        <label className="btn small">Replace photo<input hidden type="file" accept="image/*" capture="environment" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { await db.photos.put({ id: f.id, blob: await preparePhoto(file), uploaded: 0 }); setT({ holes: [], bullet_diameter_inches: t.bullet_diameter_inches }); setMode('scale'); } }} /></label>
        <button className="btn small" onClick={() => nav(-1)}>Cancel</button>
      </div>
    </div>
  );
}
