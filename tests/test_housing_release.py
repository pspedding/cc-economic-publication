import copy,hashlib,json,pathlib,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import build_housing_release as H
class HousingRelease(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory();self.p=pathlib.Path(self.t.name)
        self.source=json.loads((ROOT/'data/sources/housing_approved.json').read_text())
    def tearDown(self):self.t.cleanup()
    def build(self):
        s=self.p/'source.json';s.write_text(json.dumps(self.source))
        return H.build('f49d3d9',s,self.p/'data')
    def test_exact_counts_and_idempotent_66_outputs(self):
        data=self.build();self.assertEqual(len(data),65)
        before={str(p.relative_to(self.p)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (self.p/'data').rglob('*') if p.is_file()}
        self.assertEqual(len(before),66);self.build()
        self.assertEqual(before,{str(p.relative_to(self.p)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (self.p/'data').rglob('*') if p.is_file()})
    def test_duplicate_and_wrong_order_fail_before_writing(self):
        for mode in ['duplicate','reverse']:
            value=copy.deepcopy(self.source);d=self.source['au_dwelling_mom']
            if mode=='duplicate':d['series'][1]['date']=d['series'][0]['date']
            else:d['series'].reverse()
            with self.assertRaises(ValueError):self.build()
            self.assertFalse((self.p/'data').exists());self.source=value
    def test_wrong_id_unit_and_source_fail(self):
        for field,value in [('slug','bad'),('unit','ratio'),('source','Cotality')]:
            old=self.source['au_dwelling_mom'][field];self.source['au_dwelling_mom'][field]=value
            with self.assertRaises(ValueError):self.build()
            self.source['au_dwelling_mom'][field]=old
    def test_nonfinite_boolean_and_null_rejected(self):
        for value in [None,True,float('nan')]:
            old=self.source['au_dwelling_mom']['series'][0]['value'];self.source['au_dwelling_mom']['series'][0]['value']=value
            with self.assertRaises(ValueError):self.build()
            self.source['au_dwelling_mom']['series'][0]['value']=old
    def test_existing_refresh_rejects_silent_six_series_removal(self):
        from refresh_data import reconcile
        data=self.build();old={k:v for k,v in data.items() if k not in H.IDS}
        with self.assertRaisesRegex(ValueError,'Unexpected indicator ID change'):reconcile(data,old,[],lambda *a:{})
