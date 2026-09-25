import json, sys, concurrent.futures as cf
B='Return ONLY a JSON array (no prose). One object per distinct bullet product visible on the page: {"manufacturer":str,"line":str (product line e.g. ELD Match, MatchKing HPBT),"caliber":str (as shown),"diameter_in":number|null,"weight_gr":number,"type":"Match"|"Hunting"|"Varmint"|"Handgun"|"Other","g1":number|null,"g7":number|null,"item":str|null}. Include every weight and caliber listed. If the page has no products, return [].'
P='Return ONLY a JSON array (no prose). One object per distinct reloading powder named on the page: {"manufacturer":str,"name":str,"use":"Rifle"|"Pistol"|"Shotgun"|"Multi"|null,"form":"Ball/Spherical"|"Extruded/Stick"|"Flake"|null,"burn_rank":int|null (position on a burn-rate chart if the page is a chart, fastest=1)}. Include every powder listed.'
PR='Return ONLY a JSON array (no prose). One object per distinct primer product on the page: {"manufacturer":str,"name":str (model/number e.g. BR-2, 210M),"size":"Small Pistol"|"Small Pistol Magnum"|"Large Pistol"|"Large Pistol Magnum"|"Small Rifle"|"Small Rifle Magnum"|"Large Rifle"|"Large Rifle Magnum"|"Shotshell"|"Other","item":str|null}.'
C='Return ONLY a JSON array (no prose). One object per distinct unprimed/new cartridge case (brass) product on the page: {"manufacturer":str,"cartridge":str,"item":str|null,"notes":str|null (e.g. small primer pocket)}. Include every cartridge listed.'
jobs=json.load(open(sys.argv[1]))
def run(j):
    name,url,kind=j
    try:
        r=pplx_sdk.content.fetch([url],prompt={'b':B,'p':P,'pr':PR,'c':C}[kind])[0]
        txt=(r.content or '').strip()
        if r.error: out={'error':r.error}
        else:
            s=txt[txt.find('['):txt.rfind(']')+1] if '[' in txt else '[]'
            try: out=json.loads(s)
            except Exception as e: out={'error':'parse','raw':txt[:3000]}
    except Exception as e: out={'error':str(e)}
    json.dump({'url':url,'kind':kind,'data':out},open(f'/home/user/workspace/catalog_raw/{name}.json','w'))
    return name, (len(out) if isinstance(out,list) else out.get('error'))
with cf.ThreadPoolExecutor(8) as ex:
    for n,c in ex.map(run,jobs): print(n,c)
