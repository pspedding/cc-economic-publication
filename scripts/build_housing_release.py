#!/usr/bin/env python3
"""Deterministic manual release overlay; no downloads, workbook writes or scheduling.

Rebuild this approved release with:
 python scripts/build_housing_release.py --baseline-ref f49d3d9 --output-root /private/review/data
Uses the existing macro_data serializer. Do not use this release baseline as a
replacement for a future independently approved core refresh.
"""
import argparse,json,math,pathlib,subprocess
from macro_data import write_outputs
ROOT=pathlib.Path(__file__).resolve().parents[1]
IDS={f'{g}_dwelling_{m}' for g in ['au','sydney'] for m in ['mom','yoy','median_value']}
def read_bundle(raw):
    start='const CC_ECONOMIC_DATA = '
    if start not in raw:raise ValueError('Unrecognised baseline bundle')
    return json.JSONDecoder().raw_decode(raw.split(start,1)[1])[0]
def build(baseline_ref,source,output_root):
    raw=subprocess.check_output(['git','show',baseline_ref+':data/data.js'],cwd=ROOT,text=True)
    baseline=read_bundle(raw);addition=json.loads(pathlib.Path(source).read_text())
    if set(addition)!=IDS:raise ValueError('Expected exactly six approved housing IDs')
    expected=[f'{y}-{m:02}-01' for y in range(2022,2027) for m in range(1,13) if '2022-04'<=f'{y}-{m:02}'<='2026-08']
    for slug,d in addition.items():
        median=slug.endswith('median_value')
        if d.get('slug')!=slug or d.get('source')!='PropTrack Home Price Index':raise ValueError('Source/slug mismatch')
        if d.get('unit')!=('AUD' if median else '%') or d.get('format')!=('dollar_0' if median else 'percent_direct'):raise ValueError('Unit/format mismatch')
        if d.get('latestObservationMonth')!='2026-08' or d.get('freq')!='monthly':raise ValueError('Frequency/latest mismatch')
        if [p.get('date') for p in d.get('series',[])]!=expected:raise ValueError('Date order, duplicate or coverage failure')
        for p in d['series']:
            v=p['value']
            if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Invalid number')
        if slug in baseline and baseline[slug]!=d:raise ValueError('Unapproved baseline collision')
    result={**baseline,**addition};write_outputs(result,{},pathlib.Path(output_root))
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline-ref',required=True)
    p.add_argument('--source',type=pathlib.Path,default=ROOT/'data/sources/housing_approved.json')
    p.add_argument('--output-root',type=pathlib.Path,required=True)
    a=p.parse_args();r=build(a.baseline_ref,a.source,a.output_root)
    print(json.dumps({'indicators':len(r),'approved_additions':6,'automatic_publication':False}))
