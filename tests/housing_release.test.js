const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const {page}=require('./page_harness.js'),S=require('../scripts/scatter-analysis.js'),M=require('../scripts/indicator-metadata.js');
const data=require('../data/data.js'),six=require('../data/sources/housing_approved.json');
const BASE='f49d3d94950527fd157a6a775ef7862c4002e95a';
const show=f=>cp.execFileSync('git',['show',BASE+':'+f]);
const base=JSON.parse(show('data/data.js').toString().split('const CC_ECONOMIC_DATA = ')[1].split(';\n\nif (typeof module')[0]);
const html=fs.readFileSync('index.html','utf8');
const near=(a,b)=>assert(Math.abs(a-b)<1e-10);
test('approved six IDs and all 318 observations match immutable accepted release fingerprint',()=>{
 assert.equal(Object.keys(base).length,59);assert.equal(Object.keys(data).length,65);assert.equal(Object.keys(six).length,6);
 const payload=Object.fromEntries(Object.entries(six).map(([k,v])=>[k,v.series]));
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),'21d160cbc6b335406750f5e80aa44a05ee15e105a4157f692932cd41cd209b98');
 let n=0;for(const [slug,d]of Object.entries(six)){assert(!slug.startsWith('proptrack_'));assert(!d.name.startsWith('PropTrack '));assert.equal(d.source,'PropTrack Home Price Index');assert.deepEqual(data[slug],d);assert.equal(d.series.length,53);assert.equal(new Set(d.series.map(p=>p.date)).size,53);assert.equal(d.series[0].date,'2022-04-01');assert.equal(d.series.at(-1).date,'2026-08-01');assert.equal(d.latestObservationMonth,'2026-08');for(const p of d.series){assert.equal(typeof p.value,'number');assert(Number.isFinite(p.value));n++;}}assert.equal(n,318);
});
test('original 59 objects and per-indicator files byte-identical; 66 active outputs',()=>{
 for(const [slug,d]of Object.entries(base)){assert.deepEqual(data[slug],d);assert(fs.readFileSync('data/indicators/'+slug+'.json').equals(show('data/indicators/'+slug+'.json')));}
 for(const [slug,d]of Object.entries(data))assert.deepEqual(JSON.parse(fs.readFileSync('data/indicators/'+slug+'.json')),d);
 assert.equal(Object.keys(data).length+1,66);
});
test('all 3481 original Pearson results and calculation/format/export/lag functions unchanged',()=>{
 const a=page(show('index.html').toString(),base),b=page(html,data);let count=0;
 for(const x of Object.keys(base))for(const y of Object.keys(base)){const c=`pearsonR('${x}','${y}')`;assert.equal(a.run(c),b.run(c));count++;}assert.equal(count,3481);
 for(const n of ['pearsonR','crossCorr','bestLag','buildChartInstance','updateExplorer','updateExplorerLag','resetExplorer','formatVal','exportReport'])assert.equal(a.run(n+'.toString()'),b.run(n+'.toString()'));
});
test('32 default chart datasets/options unchanged; correlation overview adds only approved bars',()=>{
 const a=page(show('index.html').toString(),base),b=page(html,data);let lines=0;
 for(const c of a.charts.filter(c=>!c.destroyed)){const d=b.charts.find(x=>!x.destroyed&&x.canvas.id===c.canvas.id);assert(d);
  if(c.canvas.id==='corr-bar-chart'){const projected=JSON.parse(JSON.stringify(d.data));const idx=projected.labels.map((v,i)=>c.data.labels.includes(v)?i:-1).filter(i=>i>=0);projected.labels=idx.map(i=>projected.labels[i]);for(const ds of projected.datasets)for(const k of ['data','backgroundColor','borderColor'])if(Array.isArray(ds[k]))ds[k]=idx.map(i=>ds[k][i]);assert.equal(JSON.stringify(projected),JSON.stringify(c.data));}
  else {assert.equal(JSON.stringify(c.data),JSON.stringify(d.data));assert.equal(JSON.stringify(c.options),JSON.stringify(d.options));if(c.config.type==='line'&&!c.canvas.id.startsWith('macro-'))lines++;}}
 assert.equal(lines,32);
});
test('new series strict-month scatter and OLS agree with independent Pearson/OLS reference',()=>{
 for(const x of Object.keys(six))for(const y of Object.keys(six)){const j=S.join(data[x].series,data[y].series),r=S.statistics(j.points);assert.equal(r.n,53);const mx=j.points.reduce((s,p)=>s+p.x,0)/53,my=j.points.reduce((s,p)=>s+p.y,0)/53;let xx=0,yy=0,xy=0;for(const p of j.points){xx+=(p.x-mx)**2;yy+=(p.y-my)**2;xy+=(p.x-mx)*(p.y-my);}near(r.r,xy/Math.sqrt(xx*yy));near(r.slope,xy/xx);near(r.r2,r.r*r.r);}
});
test('each new selection renders original time-series/scatter, tooltip units, range/reset and lag separation',()=>{
 const p=page(html,data);for(const slug of Object.keys(six)){assert(p.nodes.get('exp-regional').options.some(o=>o.value===slug));assert(p.nodes.get('exp-macro').options.some(o=>o.value===slug));p.nodes.get('exp-regional').value=slug;p.nodes.get('exp-macro').value='cash_rate';p.nodes.get('exp-lag').value='0';p.run('updateExplorer()');let c=p.run('ExplorerScatter.chart');assert.equal(c.data.datasets[0].data.length,53);const raw=c.data.datasets[0].data.at(-1);assert.equal(c.options.plugins.tooltip.callbacks.title([{raw}]),'2026-08');assert(c.options.plugins.tooltip.callbacks.label({raw}).join(' ').includes(slug.endsWith('median_value')?'$':'%'));const old=JSON.stringify(c.data);p.nodes.get('exp-lag').value='7';p.run('updateExplorerLag()');assert.equal(JSON.stringify(p.run('ExplorerScatter.chart.data')),old);p.nodes.get('scatter-from').value='2026-01';p.nodes.get('scatter-to').value='2026-08';p.nodes.get('scatter-from').fire('change');assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),8);p.nodes.get('scatter-all-history').fire('click');assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),53);}
});
test('metadata preserves eight categories with six attributed new latest-value entries',()=>{const rows=M.rows(data);assert.equal(rows.length,65);assert.equal(new Set(rows.map(r=>r.category)).size,8);for(const slug of Object.keys(six)){const r=rows.find(x=>x.slug===slug);assert.equal(r.latestMonth,'2026-08');assert.equal(r.latestValue,six[slug].series.at(-1).value);assert.equal(r.source,'PropTrack Home Price Index');assert(r.sourceUrl);}});
test('supplied disclaimer and precision source notice visible; no private staging paths or candidate flags published',()=>{
 for(const t of ['housing-source-notice','does not consider your personal objectives','We strongly recommend that you obtain independent advice','historical precision','source notice and disclaimer'])assert(html.toLowerCase().includes(t.toLowerCase()));
 const raw=JSON.stringify(six);for(const t of ['/Users/','sourceWorkbookSha256','PRIVATE evaluation','stagingOnly','sourceWorkbookRevision'])assert(!raw.includes(t));
});
