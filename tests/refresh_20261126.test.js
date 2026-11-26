const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const ROOT=path.join(__dirname,'..');
const data=require('../data/data.js'),old=require('./accepted_20261031.js').data;
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const {page}=require('./page_harness.js');
const M=require(path.join(ROOT,'scripts/indicator-metadata.js'));
function point(slug,month){return data[slug].series.find(p=>p.date.startsWith(month))?.value;}
test('all 67 IDs, finite/null values, unique ordered calendar months and matching latest metadata',()=>{
 assert.deepEqual(Object.keys(data).sort(),[...Object.keys(old),'cpi_trimmed_mean_yoy','vehicles_evs'].sort());assert.equal(Object.keys(data).length,67);
 for(const [slug,ind] of Object.entries(data)){
  let prev='';for(const p of ind.series){const m=p.date.slice(0,7);assert(m>prev,slug);prev=m;assert(p.value===null||(typeof p.value==='number'&&Number.isFinite(p.value)),slug);}
  const meta=M.latest(ind);assert(meta.consistent,slug);assert.equal(meta.month,ind.latestObservationMonth,slug);
 }
 for(const [slug,ind] of Object.entries(data))assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT,'data/indicators',slug+'.json'))),ind);
});
test('October macro values and November cash rate present, no partial November macro values',()=>{
 assert.equal(point('aud_usd','2026-10'),.704);assert.equal(point('oil_price','2026-10'),123.92727);
 assert.equal(point('us_fed_rate','2026-10'),3.88);assert.equal(point('cash_rate','2026-11'),4.85);
 for(const slug of ['aud_usd','oil_price','us_fed_rate','bond_yield_10yr'])assert.equal(point(slug,'2026-11'),null);
 assert.equal(data.avg_mortgage_rate.latestObservationMonth,'2026-09');
});
test('PropTrack scaled once, September held median is null, all accepted historical points retained',()=>{
 assert.equal(point('au_dwelling_mom','2026-10'),-.3);assert.equal(point('au_dwelling_yoy','2026-10'),-1.9);
 assert.equal(point('sydney_dwelling_mom','2026-10'),-.4);assert.equal(point('sydney_dwelling_yoy','2026-10'),-6.6);
 assert.equal(point('au_dwelling_median_value','2026-10'),871000);assert.equal(point('sydney_dwelling_median_value','2026-10'),1169000);
 assert.equal(point('au_dwelling_median_value','2026-09'),null);
 for(const slug of Object.keys(data).filter(s=>s.includes('_dwelling_'))){assert.deepEqual(data[slug].series.slice(0,53),old[slug].series);assert.equal(data[slug].series.length,55);}
});
test('all existing explorer choices remain available at desktop and mobile harness widths',()=>{
 const baseHtml=require('./accepted_20261031.js').file('index.html').toString();
 for(const width of [1440,390]){
  const before=page(baseHtml,old,{width}),p=page(html,data,{width});
  for(const id of ['exp-regional','exp-macro'])assert.deepEqual(p.nodes.get(id).options.map(x=>x.value).filter(x=>x!=='cpi_trimmed_mean_yoy'&&x!=='vehicles_evs').sort(),before.nodes.get(id).options.map(x=>x.value).sort());
  const options=p.nodes.get('exp-regional').options.map(o=>o.value);
  for(const slug of options){p.nodes.get('exp-regional').value=slug;p.nodes.get('exp-macro').value='cash_rate';p.run('updateExplorer()');assert(p.run("chartInstances['explorer-canvas']"),slug);}
 }
});
test('PropTrack scatter pairs exclude only the held month, lag does not change strict monthly join',()=>{
 const p=page(html,data);p.nodes.get('exp-regional').value='au_dwelling_median_value';p.nodes.get('exp-macro').value='sydney_dwelling_median_value';p.run('updateExplorer()');
 const c=p.run('ExplorerScatter.chart');assert.equal(c.data.datasets[0].data.length,54);
 const snapshot=JSON.stringify(c.data);p.nodes.get('exp-lag').value='7';p.run('updateExplorerLag()');assert.equal(JSON.stringify(p.run('ExplorerScatter.chart.data')),snapshot);
 p.nodes.get('scatter-from').value='2026-09';p.nodes.get('scatter-to').value='2026-10';p.nodes.get('scatter-from').fire('change');
 assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),1);
 p.nodes.get('scatter-all-history').fire('click');assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),54);
});
test('growth scatter includes both new months and null remains a time-series gap',()=>{
 const p=page(html,data);p.nodes.get('exp-regional').value='au_dwelling_mom';p.nodes.get('exp-macro').value='sydney_dwelling_mom';p.run('updateExplorer()');
 assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),55);
 assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.at(-1).y'),-.3);
 p.nodes.get('exp-regional').value='au_dwelling_median_value';p.run('updateExplorer()');
 assert.equal(p.run("chartInstances['explorer-canvas'].data.datasets[0].data.filter(x=>x===null).length"),1);
});
test('metadata shows current periods and held value does not become zero',()=>{
 const rows=M.rows(data);assert.equal(rows.length,67);
 assert.equal(rows.find(r=>r.slug==='unemployment').latestMonth,'2026-10');
 assert.equal(rows.find(r=>r.slug==='au_dwelling_median_value').latestValue,871000);
 assert.equal(rows.find(r=>r.slug==='us_fed_rate').latestMonth,'2026-10');
 assert(!html.includes('PRIVATE LOCAL REVIEW'));assert(html.includes('September 2026 National median dwelling value is unavailable'));
});
test('unchanged analytical modules are byte-identical to accepted production',()=>{
 for(const name of fs.readdirSync(path.join(ROOT,'scripts')).filter(n=>/\.(js|css)$/.test(n)&&!['macro-analysis.js','indicator-metadata.js'].includes(n))){assert(fs.readFileSync(path.join(ROOT,'scripts',name)).equals(require('./accepted_20261031.js').file('scripts/'+name)),name);}
 assert(html.includes('April 2022–October 2026'));assert(html.includes('data/data.js?v=refinements-20261126'));
});
test('approved October retail amounts and earlier history are preserved',()=>{
 const expected={retail_total:469860000,retail_tourism:76105000,retail_discretionary:109012000};
 for(const [slug,value]of Object.entries(expected)){
  assert.equal(point(slug,'2026-10'),value);assert.equal(data[slug].latestObservationMonth,'2026-10');
  for(const p of old[slug].series.filter(p=>p.date<'2026-10-01'))assert.deepEqual(data[slug].series.find(q=>q.date===p.date),p);
 }
});
