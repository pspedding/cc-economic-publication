import copy,csv,importlib.util,json,pathlib,subprocess,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from macro_data import merge,write_outputs,SLUGS
SRC=ROOT/'data/sources';CSV=SRC/'macro_additional.csv';META=SRC/'macro_metadata.json'
LEGACY=json.loads((SRC/'legacy_dashboard.json').read_text())

class Integration(unittest.TestCase):
    def test_legacy_ids_metadata_observations_preserved(self):
        data,excluded=merge(LEGACY,CSV,META)
        self.assertEqual(len(LEGACY),37);self.assertEqual(len(data),59)
        self.assertEqual(set(LEGACY)-set(data),{'crb_index'})
        for slug,old in LEGACY.items():
            if slug=='crb_index':continue
            for k,v in old.items():self.assertEqual(data[slug][k],v,(slug,k))
        self.assertEqual(len(data)-len(set(data)&set(LEGACY)),23)
    def test_metadata_and_schema_all_indicators(self):
        data,_=merge(LEGACY,CSV,META)
        for slug,d in data.items():
            for field in ['slug','unit','freq','source','geography','basis','latestObservationMonth','series']:
                self.assertTrue(d[field],(slug,field))
            self.assertEqual(d['slug'],slug)
            self.assertEqual(len({p['date'][:7] for p in d['series']}),len(d['series']))
    def test_reconciled_confidence_and_yield_values(self):
        data,_=merge(LEGACY,CSV,META)
        expected={'2024-03':82.0,'2024-06':79.5,'2025-04':83.4,'2026-09':74.6}
        points={p['date'][:7]:p['value'] for p in data['anz_consumer_confidence']['series']}
        for k,v in expected.items():self.assertEqual(points[k],v)
        self.assertEqual(data['westpac_consumer_sentiment']['sourceSeriesId'],'GICWMICS')
        self.assertEqual(data['bond_yield_5yr']['series'][-1]['value'],4.958)
        self.assertEqual(data['bond_spread_10y_2y']['series'][-1]['value'],36.1)
        self.assertEqual(sum('10yr' in k for k in data),1)
    def test_missing_and_date_basis_preserved(self):
        data,_=merge(LEGACY,CSV,META)
        self.assertIsNone(data['nsw_household_total']['series'][-1]['value'])
        self.assertEqual(data['nsw_household_total']['latestObservationMonth'],'2026-08')
        self.assertEqual(data['bond_yield_2yr']['series'][0]['date'],'2022-04-01')
        self.assertEqual(data['cash_rate']['series'][0]['date'],'2022-04-06')
        self.assertEqual(data['bond_yield_10yr']['series'][0]['date'],'2022-04-06')
        self.assertEqual(data['anz_consumer_confidence_yoy']['series'][0]['value'],None)
    def test_unverified_and_dependent_indicators_excluded(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp)/'meta.json';m=json.loads(META.read_text())
            m['Westpac_MI_ConsumerSentiment_Index']['validation_status']='unverified';p.write_text(json.dumps(m))
            data,excluded=merge(LEGACY,CSV,p)
            self.assertNotIn('westpac_consumer_sentiment',data);self.assertNotIn('anz_minus_westpac',data)
    def test_invalid_input_and_ten_year_conflict_fail_before_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp)/'bad.csv';text=CSV.read_text()
            for bad in [text+text.splitlines()[1]+'\n',text.replace('20816.1','NaN',1),text.replace('Month,','Month,Month,',1)]:
                p.write_text(bad)
                with self.assertRaises(ValueError):merge(LEGACY,p,META)
            changed=copy.deepcopy(LEGACY);changed['bond_yield_10yr']['series'][0]['value']=99
            with self.assertRaisesRegex(ValueError,'authority'):merge(changed,CSV,META)
    def test_idempotent_generation_and_bundle_json_agreement(self):
        data,excluded=merge(LEGACY,CSV,META)
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp);write_outputs(data,excluded,p)
            before={str(x.relative_to(p)):x.read_bytes() for x in p.rglob('*') if x.is_file()}
            write_outputs(data,excluded,p)
            self.assertEqual(before,{str(x.relative_to(p)):x.read_bytes() for x in p.rglob('*') if x.is_file()})
            self.assertFalse((p/'indicators/crb_index.json').exists())
            js=subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require(process.argv[1])))",str(p/'data.js')],text=True)
            self.assertEqual(json.loads(js),data)
            for slug in data:self.assertEqual(json.loads((p/'indicators'/f'{slug}.json').read_text()),data[slug])
    def test_existing_registry_preserved(self):
        sp=importlib.util.spec_from_file_location('legacy_builder',ROOT/'scripts/build_data.py');mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)
        original=subprocess.check_output(['git','show','8b42cb4:scripts/build_data.py'],cwd=ROOT,text=True)
        ns={'__file__':str(ROOT/'scripts/build_data.py')};exec(compile(original,'baseline','exec'),ns)
        self.assertEqual(mod.INDICATORS,ns['INDICATORS'])

if __name__=='__main__':unittest.main(verbosity=2)
