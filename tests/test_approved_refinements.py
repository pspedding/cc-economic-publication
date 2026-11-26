import json,pathlib,subprocess,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import build_approved_refinements as release
class RefinementsRelease(unittest.TestCase):
    def test_68_active_outputs_rebuild_exactly_and_idempotently(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);data=release.build(release.SOURCE,root)
            self.assertEqual(len(data),67)
            before={p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()}
            self.assertEqual(len(before),68)
            for name,raw in before.items():self.assertEqual(raw,subprocess.check_output(['git','show','2584145:data/'+str(name)],cwd=ROOT))
            release.build(release.SOURCE,root)
            self.assertEqual(before,{p.relative_to(root):p.read_bytes() for p in root.rglob('*') if p.is_file()})
    def test_unapproved_change_fails_before_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);source=root/'changed.json';data=json.loads(release.SOURCE.read_text());data['vehicles_evs']['series'][-2]['value']=0;source.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'fingerprint'):release.build(source,root/'data')
            self.assertFalse((root/'data').exists())
