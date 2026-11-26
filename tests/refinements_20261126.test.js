const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),cp=require('child_process'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const data=require(path.join(ROOT,'data/data.js')),base=require(path.join(ROOT,'data/sources/approved_refresh_20261126.json'));
const {page}=require(path.join(ROOT,'tests/page_harness.js')),M=require(path.join(ROOT,'scripts/indicator-metadata.js')),S=require(path.join(ROOT,'scripts/scatter-analysis.js'));
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
test('cash rate is exactly a name-only object change',()=>{assert.equal(data.cash_rate.name,'RBA Cash Rate');assert.deepEqual({...data.cash_rate,name:base.cash_rate.name},base.cash_rate);});
test('all existing observations and 63 unaffected objects preserved',()=>{
 assert.deepEqual(Object.keys(data).sort(),[...Object.keys(base),'cpi_trimmed_mean_yoy','vehicles_evs'].sort());
 for(const slug of Object.keys(base)){assert.deepEqual(data[slug].series,base[slug].series);if(!['cash_rate','cpi_yoy'].includes(slug))assert.deepEqual(data[slug],base[slug]);}
});
test('monthly trimmed series contains 19 annual rates and no quarterly splice or partial November',()=>{
 const d=data.cpi_trimmed_mean_yoy,p=d.series.filter(p=>p.value!==null);
 assert.equal(p.length,19);assert.equal(p[0].date,'2025-04-01');assert.equal(p.at(-1).date,'2026-10-01');assert.equal(p.at(-1).value,3.8);
 assert.equal(d.series.find(p=>p.date==='2026-11-01').value,null);assert(d.series.filter(p=>p.date<'2025-04').every(p=>p.value===null));
 assert.equal(d.freq,'monthly');assert.equal(d.format,'percent_direct');assert.equal(d.unit,'%');assert.equal(d.sourceSeriesId,'A130400382R');
 assert(M.latest(d).consistent);for(const [slug,ind]of Object.entries(data))assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT,'data/indicators',slug+'.json'))),ind);
});
test('monthly CPI joins by reference month despite effective-date days in headline history',()=>{const j=S.join(data.cpi_yoy.series,data.cpi_trimmed_mean_yoy.series);assert.equal(j.points.length,19);assert(j.points.some(p=>p.month==='2025-04'||p.date==='2025-04'||JSON.stringify(p).includes('2025-04')));assert.equal(j.points.at(-1).x,4.9);assert.equal(j.points.at(-1).y,3.8);});
test('selectors, metadata and charts expose intended labels with correct percentage formatting',()=>{
 for(const width of [1440,390]){
  const p=page(html,data,{width});for(const slug of ['cash_rate','cpi_yoy','cpi_trimmed_mean_yoy']){p.nodes.get('exp-regional').value=slug;p.nodes.get('exp-macro').value='cash_rate';p.run('updateExplorer()');assert(p.run("chartInstances['explorer-canvas']"));}
  assert(p.nodes.get('exp-macro').options.some(o=>o.value==='cpi_trimmed_mean_yoy'));assert.equal(p.run("formatVal(3.8,'percent_direct')"),'3.80%');
 }
 assert(!html.includes('Cash Rate Target'));const rows=M.rows(data);assert.equal(rows.find(r=>r.slug==='cash_rate').name,'RBA Cash Rate');assert.equal(rows.find(r=>r.slug==='cpi_yoy').name,'CPI Inflation — Headline (YoY)');assert.equal(rows.find(r=>r.slug==='cpi_trimmed_mean_yoy').category,rows.find(r=>r.slug==='cpi_yoy').category);
});
test('cash-rate Pearson and lag inputs unchanged for every original indicator',()=>{
 const before=page(html,base),after=page(html,data);for(const slug of Object.keys(base)){assert.equal(before.run(`pearsonR('cash_rate','${slug}')`),after.run(`pearsonR('cash_rate','${slug}')`));assert.equal(JSON.stringify(before.run(`crossCorr(CC_ECONOMIC_DATA.cash_rate.series,CC_ECONOMIC_DATA['${slug}'].series,0)`)),JSON.stringify(after.run(`crossCorr(CC_ECONOMIC_DATA.cash_rate.series,CC_ECONOMIC_DATA['${slug}'].series,0)`)));}
});
test('macro calculation function bodies unchanged; only display labels changed',()=>{
 const a={module:{exports:{}}};vm.runInNewContext(cp.execFileSync('git',['show','08b30ce:scripts/macro-analysis.js'],{cwd:ROOT,encoding:'utf8'}),a);
 const b=require(path.join(ROOT,'scripts/macro-analysis.js'));for(const k of Object.keys(b))if(typeof b[k]==='function')assert.equal(a.module.exports[k].toString(),b[k].toString(),k);
});
test('EV is the fourth Transport chart with 52 actual counts, no zero-filled gaps or invented provenance',()=>{
 assert(html.includes("transport: ['vehicles_total', 'vehicles_private', 'vehicles_business', 'vehicles_evs']"));const d=data.vehicles_evs;
 assert.equal(d.name,'Electric Vehicles (EVs)');assert.equal(d.series.filter(p=>p.value!==null).length,52);assert.equal(d.series.find(p=>p.date==='2026-10-01').value,426);
 assert(d.series.filter(p=>p.date<'2022-07-01'||p.date==='2026-11-01').every(p=>p.value===null));assert.equal(d.validationStatus,'owner_confirmed_definition_upstream_unverified');assert(!d.sourceUrl);assert(M.latest(d).consistent);
 for(const width of [1440,390]){const p=page(html,data,{width});assert.equal(p.charts.filter(c=>!c.destroyed&&/vehicles_(total|private|business|evs)/.test(c.canvas.id)).length,4);assert.equal(p.run("formatVal(426,'integer')"),'426');}
});
test('trimmed mean is fifth directly after headline in header and both Explorer dropdowns',()=>{
 const options=html.split('<select id="macro-selector"')[1].split('</select>')[0];const ids=[...options.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids[3],'cpi_yoy');assert.equal(ids[4],'cpi_trimmed_mean_yoy');assert.equal(ids.filter(x=>x==='cpi_trimmed_mean_yoy').length,1);
 for(const width of [1440,390]){const p=page(html,data,{width});for(const id of ['exp-regional','exp-macro']){const values=p.nodes.get(id).options.map(o=>o.value);assert.equal(values[3],'cpi_yoy');assert.equal(values[4],'cpi_trimmed_mean_yoy');assert.equal(values.filter(x=>x==='cpi_trimmed_mean_yoy').length,1);}assert.equal(p.nodes.get('exp-regional').value,'unemployment');p.run('resetExplorer()');assert.equal(p.nodes.get('exp-regional').value,'unemployment');}
});
test('historical quarterly values render separately and do not become monthly correlation inputs',()=>{
 const d=data.cpi_trimmed_mean_yoy;assert.equal(d.historicalQuarterlySeries.length,10);assert.equal(d.series.filter(p=>p.value!==null).length,19);
 const p=page(html,data);p.nodes.get('exp-regional').value='cpi_trimmed_mean_yoy';p.nodes.get('exp-macro').value='cpi_yoy';p.run('updateExplorer()');
 const c=p.run("chartInstances['explorer-canvas']"),history=c.data.datasets.find(d=>d.label.includes('historical quarterly'));
 assert(history);assert.equal(history.data.filter(v=>v!==null).length,10);assert.equal(history.data[c.data.labels.findIndex(m=>m.startsWith('2022-12'))],6.8);assert.equal(history.spanGaps,true);assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),19);
 p.nodes.get('exp-macro').value='cpi_trimmed_mean_yoy';p.nodes.get('exp-regional').value='unemployment';p.run('updateExplorer()');assert(p.run("chartInstances['explorer-canvas'].data.datasets.some(d=>d.label.includes('historical quarterly'))"));
});
test('quarterly history tooltip retains quarterly label and correct primary-indicator units',()=>{
 const p=page(html,data);p.nodes.get('exp-regional').value='cpi_trimmed_mean_yoy';p.nodes.get('exp-macro').value='retail_total';p.run('updateExplorer()');const c=p.run("chartInstances['explorer-canvas']"),dataset=c.data.datasets.find(d=>d.label.includes('historical quarterly'));
 const text=c.options.plugins.tooltip.callbacks.label({raw:6.8,dataset,datasetIndex:2});assert(text.includes('historical quarterly'));assert(text.includes('6.80%'));assert(!text.includes('Retail'));
});
