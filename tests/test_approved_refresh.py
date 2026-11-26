import json, pathlib, sys, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_approved_refresh as release

class ApprovedRefresh(unittest.TestCase):
    def test_rebuild_matches_all_66_published_outputs_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            out = pathlib.Path(directory) / 'data'
            data = release.build(release.SOURCE, out)
            self.assertEqual(len(data), 65)
            before = {p.relative_to(out): p.read_bytes() for p in out.rglob('*') if p.is_file()}
            self.assertEqual(len(before), 66)
            for name, content in before.items():
                self.assertEqual(content, (ROOT / 'data' / name).read_bytes())
            release.build(release.SOURCE, out)
            self.assertEqual(before, {p.relative_to(out): p.read_bytes() for p in out.rglob('*') if p.is_file()})

    def test_modified_snapshot_rejected_before_any_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            source = root / 'changed.json'
            data = json.loads(release.SOURCE.read_text())
            data['retail_total']['series'][-1]['value'] = 0
            source.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'fingerprint'):
                release.build(source, root / 'data')
            self.assertFalse((root / 'data').exists())
