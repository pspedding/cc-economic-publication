// Actual staged bundle smoke/regression check; not a browser-rendering test.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {page}=require('./page_harness.js'),baseline=require('../data/data.js');
const directory=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw new Error('Supply the isolated candidate data directory');
const candidate=require(path.join(directory,'data.js'));
assert.deepEqual(Object.keys(candidate).sort(),Object.keys(baseline).sort());assert.equal(Object.keys(candidate).length,59);
for(const slug of Object.keys(candidate)){
  assert.deepEqual(candidate[slug],JSON.parse(fs.readFileSync(path.join(directory,'indicators',slug+'.json'))));
  if(slug!=='cpi_yoy')assert.deepEqual(candidate[slug],baseline[slug]);
}
const expected=JSON.parse(JSON.stringify(baseline.cpi_yoy));
const point=expected.series.find(p=>p.date==='2026-09-01');assert.equal(point.value,null);point.value=4.5;
expected.latestObservationMonth='2026-09';assert.deepEqual(candidate.cpi_yoy,expected);
for(const month of ['2026-08','2026-09'])assert.equal(candidate.vacancy_rate.series.find(p=>p.date.startsWith(month)).value,null);
const p=page(fs.readFileSync('index.html','utf8'),candidate);
assert.equal(p.charts.filter(c=>c.config.type==='line'&&!c.canvas.id.startsWith('macro-')).length,32);
assert.equal(p.charts.filter(c=>c.canvas.id.startsWith('macro-')).length,3);
assert.equal(p.run("MacroAnalysis.policyComparison(CC_ECONOMIC_DATA,'2026-09','2026-09').series[3].points[0].value"),4.5);
console.log(JSON.stringify({indicators:59,bundleJsonAgreements:59,unchangedIndicatorObjects:58,stagedCpi:4.5,
 vacancyMonthsHeld:2,defaultLineCharts:32,macroCharts:3,browserRendering:'offline only'},null,2));
