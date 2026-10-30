const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {page}=require('./page_harness.js'),data=require('../data/data.js');
const html=fs.readFileSync('index.html','utf8'),setup=(d=data,width=1440)=>page(html,d,{width});
test('actual popup renderer initializes exactly 59 rows and seven fields',()=>{
 const p=setup(),rows=p.nodes.get('info-tbody').children;assert.equal(rows.length,59);
 assert.deepEqual(rows.map(r=>r.dataset.slug).sort(),Object.keys(data).sort());assert(rows.every(r=>r.children.length===7));
 assert.match(p.nodes.get('info-count').textContent,/59 of 59/);assert(!html.includes('INDICATOR_META'));
});
test('rendering repeatedly replaces rows without duplicates and preserves an active search',()=>{
 const p=setup();p.nodes.get('info-search').value='bond';p.run('buildInfoTable()');p.run('buildInfoTable()');
 assert.equal(p.nodes.get('info-tbody').children.length,59);assert(p.nodes.get('info-tbody').children.some(r=>r.style.display==='none'));
 assert(p.nodes.get('info-tbody').children.some(r=>r.style.display===''));
});
test('case-insensitive existing popup search works across metadata; empty/no-match and reset states',()=>{
 const p=setup();for(const q of ['QUARTERLY','australia','cpi_yoy','basis points','2026-09']){
  p.run(`filterInfoTable(${JSON.stringify(q)})`);assert(p.nodes.get('info-tbody').children.some(r=>r.style.display===''));
 }
 p.run("filterInfoTable('nonexistent-xyz')");assert.equal(p.nodes.get('info-count').textContent,'0 of 59 active indicators');
 p.run("filterInfoTable('')");assert.equal(p.nodes.get('info-count').textContent,'59 of 59 active indicators');
});
test('metadata is inserted as text, links use noreferrer/noopener, hostile URLs are not rendered',()=>{
 const d=JSON.parse(JSON.stringify(data));d.us_fed_rate.description='<img src=x onerror=alert(1)>';d.us_fed_rate.sourceUrl='javascript:alert(1)';
 const p=setup(d),row=p.nodes.get('info-tbody').children.find(r=>r.dataset.slug==='us_fed_rate');
 assert.equal(row.children[1].textContent,d.us_fed_rate.description);assert(!row.children[2].children.some(n=>n.href));
 const official=p.nodes.get('info-tbody').children.find(r=>r.dataset.slug==='bond_yield_10yr').children[2].children.find(n=>n.href);
 assert.equal(official.target,'_blank');assert.equal(official.rel,'noopener noreferrer');
});
test('popup open/close remains independent of selections, time-series, scatter and lag',()=>{
 const p=setup();p.nodes.get('exp-regional').value='cpi_yoy';p.nodes.get('exp-lag').value='7';p.run('updateExplorer()');
 const before=JSON.stringify(p.run("chartInstances['explorer-canvas'].data")),scatter=JSON.stringify(p.run('ExplorerScatter.chart.data'));
 p.run('toggleInfo()');assert(p.nodes.get('info-overlay').classList.contains('open'));p.run('buildInfoTable()');p.run('toggleInfo()');
 assert(!p.nodes.get('info-overlay').classList.contains('open'));assert.equal(JSON.stringify(p.run("chartInstances['explorer-canvas'].data")),before);
 assert.equal(JSON.stringify(p.run('ExplorerScatter.chart.data')),scatter);assert.equal(p.nodes.get('exp-lag').value,'7');
});
test('responsive popup scroll is scoped and keeps seven readable columns at desktop/mobile widths',()=>{
 for(const width of [1440,768,390,360]){const p=setup(data,width);assert.equal(p.nodes.get('info-tbody').children.length,59);}
 const css=fs.readFileSync('scripts/indicator-metadata.css','utf8');assert.match(css,/#info-overlay \.info-table-wrap \{overflow:auto/);
 assert.match(css,/max-width:600px/);assert.match(css,/#info-table \{min-width:1050px/);assert(!/^\s*(?:header|\.pub-header)\s*\{/m.test(css));
});
