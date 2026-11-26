#!/usr/bin/env python3
"""Serialize the owner-approved 27 November 2026 vacancy/KPI snapshot. No network or workbook writes.

This is a release snapshot, not a replacement for source reconciliation or approval
of future refreshes. Older builders retain their historical input contracts.
"""
import argparse, hashlib, json, math, pathlib, re
from macro_data import write_outputs

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/approved_vacancies_20261127.json'

def build(source, output_root):
    raw = pathlib.Path(source).read_bytes()
    if hashlib.sha256(raw).hexdigest() != '7c3f35144a14592fb02e5f7a4a6ceaebb54ee8478a4d0af8f46f275674b03247':
        raise ValueError('Snapshot differs from approved release fingerprint')
    data = json.loads(raw)
    if len(data) != 68:
        raise ValueError('Approved indicator inventory mismatch')
    for slug, ind in data.items():
        if ind['slug'] != slug:
            raise ValueError('Slug mismatch')
        months = []
        observed = []
        for point in ind['series']:
            date, value = point['date'], point['value']
            if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])-\d{2}', date):
                raise ValueError('Invalid date')
            months.append(date[:7])
            if value is not None:
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                    raise ValueError('Invalid observation')
                observed.append(date[:7])
        if months != sorted(set(months)) or not observed or ind['latestObservationMonth'] != max(observed):
            raise ValueError('Month order or latest metadata mismatch')
    history = data['cpi_trimmed_mean_yoy']['historicalQuarterlySeries']
    if len(history) != 10 or any(p['date'][5:7] not in ('03','06','09','12') for p in history):
        raise ValueError('Quarterly display history mismatch')
    if sum(p['value'] is not None for p in data['cpi_trimmed_mean_yoy']['series']) != 19:
        raise ValueError('Monthly trimmed mean coverage mismatch')
    count = data['residential_vacancies']
    if count['unit'] != 'count' or count['format'] != 'integer':
        raise ValueError('Vacancy count unit/format mismatch')
    observed_counts = [p['value'] for p in count['series'] if p['value'] is not None]
    if len(observed_counts) != 55 or any(v < 0 or int(v) != v for v in observed_counts):
        raise ValueError('Vacancy count coverage/value mismatch')
    write_outputs(data, {}, pathlib.Path(output_root))
    return data

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=pathlib.Path, default=SOURCE)
    parser.add_argument('--output-root', type=pathlib.Path, required=True)
    args = parser.parse_args()
    print(json.dumps({'indicators': len(build(args.source, args.output_root))}))
