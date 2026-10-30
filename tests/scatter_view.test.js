const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {page}=require('./page_harness.js'),data=require('../data/data.js');
const html=fs.readFileSync('index.html','utf8');
const setup=()=>page(html,data);
function choose(p,y='cpi_yoy',x='cash_rate') {p.nodes.get('exp-regional').value=y;p.nodes.get('exp-macro').value=x;p.run('updateExplorer()');}
test('one scatter below time series; same selections, X compare and Y primary',()=>{
  const p=setup();choose(p);const c=p.run('ExplorerScatter.chart');
  assert.equal(c.config.type,'scatter');assert.match(c.options.scales.x.title.text,/Cash Rate/);assert.match(c.options.scales.y.title.text,/CPI/);
  assert.equal(c.data.datasets[0].data.length,54);assert.equal(c.data.datasets[0].data.at(-1).y,4.3);
  assert(html.indexOf('id="scatter-card"')>html.indexOf('id="explorer-canvas"'));assert.match(p.nodes.get('scatter-stats').textContent,/n = 54/);
});
test('lag changes preserve strict scatter points and statistics, legacy lag still works',()=>{
  const p=setup();choose(p);const before=JSON.stringify(p.run('ExplorerScatter.chart.data'));
  const stats=p.nodes.get('scatter-stats').textContent;
  p.nodes.get('exp-lag').value='7';p.run('updateExplorerLag()');
  assert.equal(JSON.stringify(p.run('ExplorerScatter.chart.data')),before);assert.equal(p.nodes.get('scatter-stats').textContent,stats);
  assert.match(p.run("chartInstances['explorer-canvas'].data.datasets[1].label"),/7mo/);
});
test('date range filters stats and points; All History restores without changing selections',()=>{
  const p=setup();choose(p);p.nodes.get('scatter-from').value='2026-01';p.nodes.get('scatter-to').value='2026-09';p.nodes.get('scatter-from').fire('change');
  assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),9);
  p.nodes.get('scatter-all-history').fire('click');assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),54);
  assert.equal(p.nodes.get('exp-regional').value,'cpi_yoy');assert.equal(p.nodes.get('exp-macro').value,'cash_rate');
});
test('invalid range clears stale scatter, reports error and recovers',()=>{
  const p=setup();choose(p);p.nodes.get('scatter-from').value='2026-09';p.nodes.get('scatter-to').value='2025-01';p.nodes.get('scatter-to').fire('change');
  assert.equal(p.run('ExplorerScatter.chart'),null);assert.match(p.nodes.get('scatter-status').textContent,/From month/);
  p.nodes.get('scatter-all-history').fire('click');assert(p.run('ExplorerScatter.chart'));
});
test('OLS, outliers and year colours do not remove points or change statistics',()=>{
  const p=setup();choose(p);const stats=p.nodes.get('scatter-stats').textContent;
  for(const id of ['scatter-trend','scatter-outliers','scatter-years']){p.nodes.get(id).checked=true;p.nodes.get(id).fire('change');}
  const c=p.run('ExplorerScatter.chart');assert.equal(c.data.datasets.length,2);assert.equal(c.data.datasets[1].data.length,2);
  assert.equal(c.data.datasets[0].data.length,54);assert.equal(p.nodes.get('scatter-stats').textContent,stats);
  assert(p.nodes.get('scatter-year-key').children.length>1);assert(new Set(c.data.datasets[0].backgroundColor).size>1);
});
test('tooltip shows month, names, formatted values and source dates; touch supported',()=>{
  const p=setup();choose(p);const c=p.run('ExplorerScatter.chart'),raw=c.data.datasets[0].data.at(-1),cb=c.options.plugins.tooltip.callbacks;
  assert.equal(cb.title([{raw}]),'2026-09');assert.match(cb.label({raw}).join(' '),/CPI Inflation.*4.30%/);
  assert.match(cb.label({raw}).join(' '),/Cash Rate.*%/);assert.match(cb.label({raw}).join(' '),/Source dates/);
  assert(c.options.events.includes('touchstart'));assert.equal(c.options.plugins.tooltip.filter({datasetIndex:1}),false);
  assert.equal(cb.title([{raw},{raw}]),'Coincident paired months');assert.match(cb.label({raw}).join(' '),/Observation month: 2026-09/);
});
test('year colours stay stable when date range changes',()=>{
  const p=setup();choose(p);p.nodes.get('scatter-years').checked=true;p.nodes.get('scatter-years').fire('change');
  let c=p.run('ExplorerScatter.chart'),before=c.data.datasets[0].backgroundColor.at(-1);
  p.nodes.get('scatter-from').value='2026-01';p.nodes.get('scatter-from').fire('change');
  c=p.run('ExplorerScatter.chart');assert.equal(c.data.datasets[0].backgroundColor.at(-1),before);
});
test('selection changes and legacy reset synchronize scatter and destroy old chart',()=>{
  const p=setup();choose(p);const old=p.run('ExplorerScatter.chart');choose(p,'vacancy_rate');
  assert.equal(old.destroyed,true);assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),52);
  p.run('resetExplorer()');assert.match(p.run('ExplorerScatter.chart.options.scales.y.title.text'),/Unemployment/);
});
test('same indicator supports identity relationship; non-overlap reports insufficient',()=>{
  const p=setup();choose(p,'bond_yield_2yr','bond_yield_2yr');assert.match(p.nodes.get('scatter-stats').textContent,/r = 1.000/);
  p.nodes.get('scatter-from').value='2026-10';p.nodes.get('scatter-to').value='2026-10';p.nodes.get('scatter-from').fire('change');
  assert.match(p.nodes.get('scatter-status').textContent,/At least 4/);assert.match(p.nodes.get('scatter-stats').textContent,/n = 0/);
});
test('duplicate observations fail closed in the view, including outside selected range',()=>{
  const d=JSON.parse(JSON.stringify(data));d.cpi_yoy.series.push({date:'2022-04-30',value:null});
  const p=page(html,d);choose(p);assert.equal(p.run('ExplorerScatter.chart'),null);
  assert.match(p.nodes.get('scatter-status').textContent,/Duplicate observation month/);
});
test('empty, constant and short series report unavailable instead of misleading statistics',()=>{
  for(const values of [[],[0,1],[1,1,1,1]]) {
    const d=JSON.parse(JSON.stringify(data));d.cpi_yoy.series=values.map((value,i)=>({date:`2026-0${i+1}-01`,value}));
    const p=page(html,d);choose(p);assert.match(p.nodes.get('scatter-stats').textContent,/r = unavailable/);
    p.nodes.get('scatter-trend').checked=true;p.nodes.get('scatter-trend').fire('change');assert.equal(p.run('ExplorerScatter.chart.data.datasets.length'),1);
  }
});
test('residual flags use shape and outline, retain sample and expose reason in tooltip',()=>{
  const d=JSON.parse(JSON.stringify(data));
  d.cash_rate.series=Array.from({length:12},(_,i)=>({date:`2025-${String(i+1).padStart(2,'0')}-01`,value:i}));
  d.cpi_yoy.series=d.cash_rate.series.map((p,i)=>({date:p.date,value:2*i+(i===6?20:0)}));
  const p=page(html,d);choose(p);p.nodes.get('scatter-outliers').checked=true;p.nodes.get('scatter-outliers').fire('change');
  const c=p.run('ExplorerScatter.chart'),raw=c.data.datasets[0].data[6];
  assert.equal(c.data.datasets[0].pointStyle[6],'triangle');assert.equal(c.data.datasets[0].data.length,12);
  assert.match(c.options.plugins.tooltip.callbacks.label({raw}).join(' '),/not necessarily an error/);
});
test('responsive contracts at desktop and mobile widths; not rendered-layout evidence',()=>{
  for(const width of [1440,768,390,360]){
    const p=page(html,data,{width}),c=p.run('ExplorerScatter.chart');
    assert.equal(c.options.responsive,true);assert.equal(c.options.maintainAspectRatio,false);
  }
  const css=fs.readFileSync('scripts/scatter.css','utf8');assert.match(css,/max-width:600px/);assert.match(css,/min-height:44px/);assert.match(css,/flex-wrap:wrap/);
});
