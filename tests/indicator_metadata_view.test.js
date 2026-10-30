const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {page}=require('./page_harness.js'),data=require('../data/data.js');
const html=fs.readFileSync('index.html','utf8'),setup=(d=data,width=1440)=>page(html,d,{width});
const walk=n=>[n,...n.children.flatMap(walk)];
const entries=p=>walk(p.nodes.get('info-tbody')).filter(n=>n.dataset?.slug);
const find=(p,slug)=>entries(p).find(n=>n.dataset.slug===slug);
const fields=n=>{const dl=n.children[1],r={};for(let i=0;i<dl.children.length;i+=2)r[dl.children[i].textContent]=dl.children[i+1];return r;};
test('directory initializes eight native category expanders, 59 unique entries and four summary columns',()=>{
 const p=setup(),groups=p.nodes.get('info-tbody').children,rows=entries(p);assert.equal(groups.length,8);assert.equal(rows.length,59);
 assert.deepEqual(rows.map(r=>r.dataset.slug).sort(),Object.keys(data).sort());assert(rows.every(r=>r.children[0].children.length===4));
 assert(groups.every(g=>g.tagName==='DETAILS'&&g.children[0].tagName==='SUMMARY'));assert(rows.every(r=>r.tagName==='DETAILS'&&r.children[0].tagName==='SUMMARY'));
 assert.match(p.nodes.get('info-count').textContent,/59 of 59/);assert(!html.includes('INDICATOR_META'));
});
test('full metadata preserves Content Area, definition, Source, Frequency, Scope, units and source link',()=>{
 const p=setup(),f=fields(find(p,'cpi_yoy'));
 for(const k of ['Indicator','Content Area','Definition','Source','Frequency','Scope','Units','Source link','Latest Period','Latest Value'])assert(f[k]);
 assert.equal(f.Definition.textContent,data.cpi_yoy.description);assert.equal(f.Source.textContent,data.cpi_yoy.source);assert.equal(f.Scope.textContent,'Australia');
 assert.equal(f['Latest Period'].textContent,'2026-09');assert.equal(f['Latest Value'].textContent,'4.30%');
});
test('rendering repeatedly replaces entries without duplicates and preserves active search and category state',()=>{
 const p=setup();p.nodes.get('info-tbody').children[0].open=true;p.nodes.get('info-search').value='bond';p.run('filterInfoTable("bond")');p.run('buildInfoTable()');p.run('buildInfoTable()');
 assert.equal(entries(p).length,59);assert(entries(p).some(r=>r.hidden));assert(entries(p).some(r=>!r.hidden));
 p.nodes.get('info-search').value='';p.run('filterInfoTable("")');assert.equal(p.nodes.get('info-tbody').children[0].open,true);
});
test('search matches full metadata and values, expands matching categories, hides empty groups and resets',()=>{
 const p=setup();for(const q of ['QUARTERLY','australia','cpi_yoy','basis points','2026-09','4.30%']){
  p.run(`filterInfoTable(${JSON.stringify(q)})`);assert(entries(p).some(r=>!r.hidden));assert(p.nodes.get('info-tbody').children.some(g=>g.open&&!g.hidden));
 }
 p.run("filterInfoTable('nonexistent-xyz')");assert.equal(p.nodes.get('info-count').textContent,'0 of 59 active indicators');assert(p.nodes.get('info-tbody').children.every(g=>g.hidden));
 p.run("filterInfoTable('')");assert.equal(p.nodes.get('info-count').textContent,'59 of 59 active indicators');assert(p.nodes.get('info-tbody').children.every(g=>!g.hidden));
});
test('metadata inserted as text, HTTPS source links safe, hostile URLs never rendered',()=>{
 const d=JSON.parse(JSON.stringify(data));d.us_fed_rate.description='<img src=x onerror=alert(1)>';d.us_fed_rate.sourceUrl='javascript:alert(1)';
 const p=setup(d),row=find(p,'us_fed_rate');assert.equal(fields(row).Definition.textContent,d.us_fed_rate.description);assert(!walk(row).some(n=>n.href));
 const official=walk(find(p,'bond_yield_10yr')).find(n=>n.href);assert.equal(official.target,'_blank');assert.equal(official.rel,'noopener noreferrer');
});
test('latest formatting reuses dashboard conventions for all indicators, percent/currencies/counts/index and basis points',()=>{
 const p=setup();for(const [slug,ind] of Object.entries(data)){
  const f=fields(find(p,slug)),point=ind.series.filter(p=>typeof p.value==='number'&&Number.isFinite(p.value)).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  const formatted=p.run(`formatVal(${point.value},${JSON.stringify(ind.format)})`);
  assert(f['Latest Value'].textContent.startsWith(formatted),slug);assert.equal(f['Latest Period'].textContent,point.date.slice(0,7));
 }
 assert.match(fields(find(p,'house_price'))['Latest Value'].textContent,/^\$.* AUD$/);
 assert.match(fields(find(p,'bond_spread_10y_2y'))['Latest Value'].textContent,/basis points$/);
 assert.match(fields(find(p,'anz_consumer_confidence'))['Latest Value'].textContent,/index points$/);
});
test('zero is formatted, all-null is unavailable, mismatch warning visible in full metadata',()=>{
 const d=JSON.parse(JSON.stringify(data));d.cpi_yoy.series=[{date:'2026-09-01',value:0},{date:'2026-10-01',value:null}];
 let p=setup(d);assert.equal(fields(find(p,'cpi_yoy'))['Latest Value'].textContent,'0.00%');
 d.cpi_yoy.latestObservationMonth='2026-08';p=setup(d);assert.match(fields(find(p,'cpi_yoy'))['Latest observation check'].textContent,/Warning:/);
 d.cpi_yoy.series=[{date:'2026-09-01',value:null}];p=setup(d);const f=fields(find(p,'cpi_yoy'));assert.equal(f['Latest Value'].textContent,'Not available');assert.equal(f['Latest Period'].textContent,'Not available');
});
test('popup focus, Escape close/return, Tab boundaries and native expander semantics',()=>{
 const p=setup(),doc=p.ctx.document,opener=doc.getElementById('metadata-test-opener');opener.focus();p.run('toggleInfo()');assert.equal(doc.activeElement,p.nodes.get('info-search'));
 const first=p.nodes.get('info-search'),last=doc.getElementById('test-last-focusable');p.nodes.get('info-overlay').querySelectorAll=()=>[first,last];let prevented=0;
 last.focus();doc.fire('keydown',{key:'Tab',preventDefault(){prevented++;}});assert.equal(doc.activeElement,first);
 first.focus();doc.fire('keydown',{key:'Tab',shiftKey:true,preventDefault(){prevented++;}});assert.equal(doc.activeElement,last);
 doc.fire('keydown',{key:'Escape',preventDefault(){prevented++;}});assert.equal(doc.activeElement,opener);assert(!p.nodes.get('info-overlay').classList.contains('open'));assert.equal(prevented,3);
 assert.match(html,/role="dialog" aria-modal="true" aria-labelledby="info-title"/);assert.match(html,/id="info-count" role="status" aria-live="polite"/);
});
test('popup remains independent of selections, time-series, scatter and inherited lag',()=>{
 const p=setup();p.nodes.get('exp-regional').value='cpi_yoy';p.nodes.get('exp-lag').value='7';p.run('updateExplorer()');
 const before=JSON.stringify(p.run("chartInstances['explorer-canvas'].data")),scatter=JSON.stringify(p.run('ExplorerScatter.chart.data'));
 p.run('toggleInfo()');p.run('buildInfoTable()');p.run('toggleInfo()');
 assert.equal(JSON.stringify(p.run("chartInstances['explorer-canvas'].data")),before);assert.equal(JSON.stringify(p.run('ExplorerScatter.chart.data')),scatter);assert.equal(p.nodes.get('exp-lag').value,'7');
});
test('responsive layout and accessibility labels at desktop/mobile widths; no header styles',()=>{
 for(const width of [1440,768,390,360])assert.equal(entries(setup(data,width)).length,59);
 const css=fs.readFileSync('scripts/indicator-metadata.css','utf8');assert.match(css,/max-width:600px/);assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);assert.match(css,/:focus-visible/);assert(!/^\s*(?:header|\.pub-header)\s*\{/m.test(css));
});
