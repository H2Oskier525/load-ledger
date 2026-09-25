// Starter reference library: product names and physical specs only (no load data).
// Users pick from here, or quick-add their own item and link it later.
export interface Cartridge { name: string; bullet_dia?: number; aliases?: string[] }
export const CARTRIDGES: Cartridge[] = [
  { name: '.17 HMR', bullet_dia: 0.172 }, { name: '.22 LR', bullet_dia: 0.223 }, { name: '.22 WMR', bullet_dia: 0.224 },
  { name: '.204 Ruger', bullet_dia: 0.204 }, { name: '.223 Remington', bullet_dia: 0.224, aliases: ['223', '.223 rem', '5.56', '5.56 nato', '223 wylde'] },
  { name: '.22-250 Remington', bullet_dia: 0.224 }, { name: '22 Creedmoor', bullet_dia: 0.224 }, { name: '.224 Valkyrie', bullet_dia: 0.224 },
  { name: '6mm ARC', bullet_dia: 0.243 }, { name: '6mm Creedmoor', bullet_dia: 0.243, aliases: ['6 creedmoor', '6mm cm'] }, { name: '6mm Dasher', bullet_dia: 0.243 },
  { name: '6mm BR Norma', bullet_dia: 0.243 }, { name: '6mm GT', bullet_dia: 0.243 }, { name: '.243 Winchester', bullet_dia: 0.243, aliases: ['243', '243 win'] },
  { name: '6.5 Grendel', bullet_dia: 0.264 }, { name: '6.5 Creedmoor', bullet_dia: 0.264, aliases: ['6.5 cm', '6.5cm', '6.5 creed', '65cm'] },
  { name: '6.5 PRC', bullet_dia: 0.264 }, { name: '6.5x55 Swedish', bullet_dia: 0.264 }, { name: '6.5-284 Norma', bullet_dia: 0.264 },
  { name: '.260 Remington', bullet_dia: 0.264 }, { name: '26 Nosler', bullet_dia: 0.264 }, { name: '6.8 Western', bullet_dia: 0.277 },
  { name: '.270 Winchester', bullet_dia: 0.277, aliases: ['270', '270 win'] }, { name: '.270 WSM', bullet_dia: 0.277 },
  { name: '7mm-08 Remington', bullet_dia: 0.284 }, { name: '7mm PRC', bullet_dia: 0.284 }, { name: '7mm Remington Magnum', bullet_dia: 0.284, aliases: ['7mm rem mag', '7 rem mag'] },
  { name: '28 Nosler', bullet_dia: 0.284 }, { name: '.280 Ackley Improved', bullet_dia: 0.284 },
  { name: '.300 AAC Blackout', bullet_dia: 0.308, aliases: ['300 blk', '300 blackout'] }, { name: '.308 Winchester', bullet_dia: 0.308, aliases: ['308', '308 win', '7.62x51', '7.62 nato'] },
  { name: '.30-06 Springfield', bullet_dia: 0.308, aliases: ['30-06', '3006'] }, { name: '.300 Winchester Magnum', bullet_dia: 0.308, aliases: ['300 win mag', '300wm'] },
  { name: '.300 PRC', bullet_dia: 0.308 }, { name: '.300 WSM', bullet_dia: 0.308 }, { name: '.300 Norma Magnum', bullet_dia: 0.308 },
  { name: '7.62x39', bullet_dia: 0.311 }, { name: '.338 Lapua Magnum', bullet_dia: 0.338 }, { name: '.338 Winchester Magnum', bullet_dia: 0.338 },
  { name: '.350 Legend', bullet_dia: 0.355 }, { name: '.375 H&H Magnum', bullet_dia: 0.375 }, { name: '.45-70 Government', bullet_dia: 0.458 },
  { name: '9mm Luger', bullet_dia: 0.355, aliases: ['9mm', '9x19'] }, { name: '.40 S&W', bullet_dia: 0.4 }, { name: '10mm Auto', bullet_dia: 0.4 },
  { name: '.357 Magnum', bullet_dia: 0.357 }, { name: '.44 Magnum', bullet_dia: 0.429 }, { name: '.45 ACP', bullet_dia: 0.451 },
];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, '').replace(/^\./, '');
export function canonicalCartridge(input?: string): string | undefined {
  if (!input) return undefined;
  const n = norm(input);
  const hit = CARTRIDGES.find((c) => norm(c.name) === n || c.aliases?.some((a) => norm(a) === n));
  return hit?.name || input.trim();
}
export const sameCartridge = (a?: string, b?: string) => !!a && !!b && norm(canonicalCartridge(a)!) === norm(canonicalCartridge(b)!);

export type CatalogType = 'bullet' | 'powder' | 'primer' | 'case';
export interface CatalogItem { key: string; type: CatalogType; manufacturer: string; product_name: string; caliber_or_size?: string; weight_grains?: number; bullet_diameter_inches?: number; bullet_type?: string }

// Bullets: [manufacturer, line, type, diameter, weights[]]
const B: [string, string, string, number, number[]][] = [
  ['Hornady', 'ELD Match', 'Match', 0.224, [52, 73, 75, 80, 88]], ['Hornady', 'ELD Match', 'Match', 0.243, [80, 108]],
  ['Hornady', 'ELD Match', 'Match', 0.264, [100, 123, 130, 140, 147]], ['Hornady', 'ELD Match', 'Match', 0.277, [145]],
  ['Hornady', 'ELD Match', 'Match', 0.284, [162, 180]], ['Hornady', 'ELD Match', 'Match', 0.308, [155, 168, 178, 195, 208, 225]],
  ['Hornady', 'ELD-X', 'Hunting', 0.243, [90, 103]], ['Hornady', 'ELD-X', 'Hunting', 0.264, [120, 143]], ['Hornady', 'ELD-X', 'Hunting', 0.277, [145]],
  ['Hornady', 'ELD-X', 'Hunting', 0.284, [150, 162, 175]], ['Hornady', 'ELD-X', 'Hunting', 0.308, [178, 200, 212]],
  ['Hornady', 'A-Tip Match', 'Match', 0.264, [135, 153]], ['Hornady', 'A-Tip Match', 'Match', 0.308, [176, 230, 250]],
  ['Hornady', 'V-MAX', 'Varmint', 0.224, [35, 40, 50, 53, 55]], ['Hornady', 'InterLock SP', 'Hunting', 0.308, [150, 165, 180]],
  ['Hornady', 'XTP', 'Handgun', 0.355, [115, 124, 147]], ['Hornady', 'XTP', 'Handgun', 0.357, [125, 158]],
  ['Sierra', 'MatchKing HPBT', 'Match', 0.224, [52, 69, 77, 80]], ['Sierra', 'MatchKing HPBT', 'Match', 0.243, [107]],
  ['Sierra', 'MatchKing HPBT', 'Match', 0.264, [123, 130, 140, 142]], ['Sierra', 'MatchKing HPBT', 'Match', 0.308, [155, 168, 175, 190, 220]],
  ['Sierra', 'Tipped MatchKing', 'Match', 0.224, [69, 77]], ['Sierra', 'Tipped MatchKing', 'Match', 0.264, [130, 140]], ['Sierra', 'Tipped MatchKing', 'Match', 0.308, [175, 195]],
  ['Sierra', 'GameChanger', 'Hunting', 0.264, [130, 140]], ['Sierra', 'GameKing SBT', 'Hunting', 0.308, [150, 165, 180]],
  ['Berger', 'Hybrid Target', 'Match', 0.224, [80.5, 85.5, 88]], ['Berger', 'Hybrid Target', 'Match', 0.243, [105, 109]],
  ['Berger', 'Hybrid Target', 'Match', 0.264, [130, 140, 144]], ['Berger', 'Hybrid Target', 'Match', 0.284, [180]], ['Berger', 'Hybrid Target', 'Match', 0.308, [185, 200.20, 215, 230]],
  ['Berger', 'VLD Hunting', 'Hunting', 0.243, [95, 105]], ['Berger', 'VLD Hunting', 'Hunting', 0.264, [130, 140]], ['Berger', 'VLD Hunting', 'Hunting', 0.284, [168, 180]], ['Berger', 'VLD Hunting', 'Hunting', 0.308, [168, 185, 210]],
  ['Berger', 'Elite Hunter', 'Hunting', 0.264, [135, 156]], ['Berger', 'Elite Hunter', 'Hunting', 0.284, [175, 195]], ['Berger', 'Elite Hunter', 'Hunting', 0.308, [205, 245]],
  ['Nosler', 'RDF', 'Match', 0.224, [70, 77, 85]], ['Nosler', 'RDF', 'Match', 0.264, [130, 140]], ['Nosler', 'RDF', 'Match', 0.308, [175, 210]],
  ['Nosler', 'AccuBond', 'Hunting', 0.264, [129, 140]], ['Nosler', 'AccuBond', 'Hunting', 0.277, [130, 140]], ['Nosler', 'AccuBond', 'Hunting', 0.284, [140, 160]], ['Nosler', 'AccuBond', 'Hunting', 0.308, [150, 165, 180]],
  ['Nosler', 'AccuBond Long Range', 'Hunting', 0.264, [142]], ['Nosler', 'AccuBond Long Range', 'Hunting', 0.284, [168, 175]], ['Nosler', 'AccuBond Long Range', 'Hunting', 0.308, [190, 210]],
  ['Nosler', 'Partition', 'Hunting', 0.277, [130, 150]], ['Nosler', 'Partition', 'Hunting', 0.308, [150, 165, 180]], ['Nosler', 'Ballistic Tip', 'Hunting', 0.243, [55, 70, 95]],
  ['Barnes', 'TTSX', 'Hunting', 0.264, [120, 127]], ['Barnes', 'TTSX', 'Hunting', 0.277, [130]], ['Barnes', 'TTSX', 'Hunting', 0.284, [139, 150]], ['Barnes', 'TTSX', 'Hunting', 0.308, [150, 168, 180]],
  ['Barnes', 'LRX', 'Hunting', 0.264, [127]], ['Barnes', 'LRX', 'Hunting', 0.308, [175, 190]], ['Barnes', 'Match Burner', 'Match', 0.308, [175]],
  ['Lapua', 'Scenar-L', 'Match', 0.243, [105]], ['Lapua', 'Scenar-L', 'Match', 0.264, [120, 136]], ['Lapua', 'Scenar-L', 'Match', 0.308, [155, 175]], ['Lapua', 'Scenar', 'Match', 0.338, [250, 300]],
  ['Cutting Edge', 'MTH', 'Hunting', 0.264, [115, 130]], ['Cutting Edge', 'MTH', 'Hunting', 0.308, [150, 180]],
  ['Speer', 'Gold Dot', 'Handgun', 0.355, [115, 124, 147]], ['Speer', 'Hot-Cor SP', 'Hunting', 0.308, [150, 165, 180]],
  ['Sierra', 'Sports Master JHP', 'Handgun', 0.355, [115, 125]], ['Hornady', 'HAP', 'Handgun', 0.355, [115, 121, 125]],
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const bullets: CatalogItem[] = B.flatMap(([m, line, t, d, ws]) => ws.map((w) => ({ key: `bullet:${slug(m)}:${slug(line)}:${d}:${w}`, type: 'bullet' as const, manufacturer: m, product_name: `${line} ${w} gr`, caliber_or_size: `${d.toFixed(3)}"`, weight_grains: w, bullet_diameter_inches: d, bullet_type: t })));

const P: [string, string[]][] = [
  ['Hodgdon', ['H4350', 'H4831SC', 'H1000', 'Retumbo', 'Varget', 'H4895', 'CFE 223', 'Benchmark', 'H335', 'Superformance', 'H322', 'H414', 'Titegroup', 'CFE Pistol', 'H110']],
  ['IMR', ['IMR 4064', 'IMR 4166', 'IMR 4350', 'IMR 4451', 'IMR 7977', 'IMR 8208 XBR', 'IMR 4895', 'IMR 7828']],
  ['Alliant', ['Reloder 15', 'Reloder 16', 'Reloder 23', 'Reloder 26', 'Reloder 22', 'Reloder 17', 'Power Pro 2000-MR', 'Power Pro Varmint', 'Bullseye', 'Unique', '2400', 'Sport Pistol', 'Power Pistol']],
  ['Vihtavuori', ['N133', 'N140', 'N150', 'N160', 'N165', 'N170', 'N550', 'N555', 'N560', 'N565', '3N37', 'N320']],
  ['Winchester', ['StaBall 6.5', 'StaBall HD', 'Winchester 748', 'Winchester 760', 'Winchester 231', 'Winchester 296']],
  ['Ramshot', ['Hunter', 'Magnum', 'Big Game', 'TAC', 'Enforcer']],
  ['Accurate', ['Accurate 2230', 'Accurate 2520', 'Accurate 4064', 'Accurate 4350', 'Accurate No. 5']],
  ['Norma', ['Norma 203B', 'Norma URP', 'Norma MRP']],
  ['Shooters World', ['Precision', 'Long Rifle', 'Match Rifle']],
];
const powders: CatalogItem[] = P.flatMap(([m, ns]) => ns.map((n) => ({ key: `powder:${slug(m)}:${slug(n)}`, type: 'powder' as const, manufacturer: m, product_name: n })));

const PR: [string, string, string][] = [
  ['CCI', 'BR-4', 'Small Rifle'], ['CCI', '400', 'Small Rifle'], ['CCI', '450', 'Small Rifle Magnum'], ['CCI', '41', 'Small Rifle (5.56 NATO)'],
  ['CCI', 'BR-2', 'Large Rifle'], ['CCI', '200', 'Large Rifle'], ['CCI', '250', 'Large Rifle Magnum'], ['CCI', '500', 'Small Pistol'], ['CCI', '300', 'Large Pistol'],
  ['Federal', '205M Gold Medal Match', 'Small Rifle'], ['Federal', '205', 'Small Rifle'], ['Federal', '210M Gold Medal Match', 'Large Rifle'], ['Federal', '210', 'Large Rifle'],
  ['Federal', '215M Gold Medal Match', 'Large Rifle Magnum'], ['Federal', '100', 'Small Pistol'], ['Federal', '150', 'Large Pistol'],
  ['Winchester', 'WSR', 'Small Rifle'], ['Winchester', 'WLR', 'Large Rifle'], ['Winchester', 'WLRM', 'Large Rifle Magnum'], ['Winchester', 'WSP', 'Small Pistol'],
  ['Remington', '7 1/2 BR', 'Small Rifle'], ['Remington', '9 1/2', 'Large Rifle'], ['Remington', '9 1/2M', 'Large Rifle Magnum'],
  ['Murom', 'KVB-223M', 'Small Rifle'], ['Murom', 'KVB-7', 'Large Rifle'], ['Fiocchi', 'Small Pistol', 'Small Pistol'],
];
const primers: CatalogItem[] = PR.map(([m, n, sz]) => ({ key: `primer:${slug(m)}:${slug(n)}`, type: 'primer' as const, manufacturer: m, product_name: n, caliber_or_size: sz }));

export const CASE_BRANDS = ['Lapua', 'Peterson', 'Alpha Munitions', 'Starline', 'Hornady', 'Norma', 'Nosler', 'Winchester', 'Federal', 'Remington', 'ADG', 'Gunwerks', 'Lake City', 'Mixed / range pickup'];
export const caseItem = (brand: string, cartridge: string): CatalogItem => ({ key: `case:${slug(brand)}:${slug(cartridge)}`, type: 'case', manufacturer: brand, product_name: `${cartridge} brass`, caliber_or_size: cartridge });

export const CATALOG: CatalogItem[] = [...bullets, ...powders, ...primers];
export function searchCatalog(type: CatalogType, q: string, opts?: { diameter?: number; cartridge?: string }): CatalogItem[] {
  if (type === 'case') { const c = opts?.cartridge || ''; return CASE_BRANDS.map((b) => caseItem(b, c || 'Case')).filter((i) => `${i.manufacturer} ${i.product_name}`.toLowerCase().includes(q.toLowerCase())); }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return CATALOG.filter((i) => i.type === type && (!opts?.diameter || !i.bullet_diameter_inches || Math.abs(i.bullet_diameter_inches - opts.diameter) < 0.0015) && words.every((w) => `${i.manufacturer} ${i.product_name} ${i.caliber_or_size || ''} ${i.bullet_type || ''}`.toLowerCase().includes(w))).slice(0, 40);
}
let CUSTOM: Cartridge[] = [];
export const setCustomCartridges = (c: Cartridge[]) => { CUSTOM = c; };
export const cartridgeDiameter = (c?: string) => [...CARTRIDGES, ...CUSTOM].find((x) => x.name === canonicalCartridge(c))?.bullet_dia;
