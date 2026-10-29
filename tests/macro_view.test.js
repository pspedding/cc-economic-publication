const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {page}=require('./page_harness.js'),data=require('../data/data.js');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('scripts/macro-analysis.css','utf8');
function setup(dataOverride=data,width=1280){return page(html,dataOverride,{width});}
test('three macro charts initialize independently after the original charts',()=>{
  const p=setup();assert.equal(p.charts.filter(c=>c.canvas.id.startsWith('macro-')).length,3);
  assert.equal(p.run('Object.keys(MacroDashboard.charts).length'),3);
  assert.match(p.nodes.get('macro-status').textContent,/missing values remain gaps/);
  assert.equal(p.nodes.get('macro-month-a').value,'2026-09');assert.equal(p.nodes.get('macro-month-b').value,'2025-09');
});
test('two historical months can be changed independently; summary and exact tooltips update',()=>{
  const p=setup();p.nodes.get('macro-month-a').value='2022-04';p.nodes.get('macro-month-a').fire('change');
  assert.equal(p.nodes.get('macro-month-b').value,'2025-09');
  assert.match(p.nodes.get('macro-spread-a').textContent,/86.0 bp/);
  const chart=p.run('MacroDashboard.charts.curve');
  assert.equal(chart.data.datasets[0].data[0].y,2.148);assert.equal(chart.data.datasets[0].spanGaps,false);
  assert.equal(chart.options.plugins.tooltip.callbacks.label({parsed:{x:2,y:2.148}}),'2Y: 2.148%');
  p.nodes.get('macro-month-b').value='2022-04';p.nodes.get('macro-month-b').fire('change');
  assert.equal(JSON.stringify(p.run('MacroDashboard.charts.curve.data.datasets[0].data')),JSON.stringify(p.run('MacroDashboard.charts.curve.data.datasets[1].data')));
  assert.match(p.nodes.get('macro-curve-detail').textContent,/2Y 2.148%/);
});
test('missing maturity and missing spread display explicitly, never zero or interpolated',()=>{
  const d=JSON.parse(JSON.stringify(data));d.bond_yield_2yr.series=d.bond_yield_2yr.series.filter(p=>!p.date.startsWith('2026-09'));
  const p=setup(d),curve=p.run('MacroDashboard.charts.curve');
  assert.equal(curve.data.datasets[0].data[0].y,null);assert.match(p.nodes.get('macro-spread-a').textContent,/not available/);
  assert.match(p.nodes.get('macro-curve-detail').textContent,/missing 2Y/);
});
test('shared historical range updates both spread and policy charts; invalid range preserves charts',()=>{
  const p=setup();p.nodes.get('macro-from').value='2022-04';p.nodes.get('macro-to').value='2022-06';p.nodes.get('macro-from').fire('change');
  assert.equal(p.run('MacroDashboard.charts.spread.data.labels.length'),3);assert.equal(p.run('MacroDashboard.charts.policy.data.labels.length'),3);
  const old=p.run('MacroDashboard.charts.spread');p.nodes.get('macro-from').value='2026-09';p.nodes.get('macro-from').fire('change');
  assert.equal(p.run('MacroDashboard.charts.spread'),old);assert.match(p.nodes.get('macro-range-message').textContent,/last valid range/);
  p.nodes.get('macro-all-history').fire('click');assert.equal(p.nodes.get('macro-from').value,'2022-04');assert.equal(p.nodes.get('macro-to').value,'2026-10');
});
test('negative spreads are identified by text, colour and zero reference; missing months remain gaps',()=>{
  const d=JSON.parse(JSON.stringify(data));d.bond_yield_2yr.series.find(p=>p.date.startsWith('2026-09')).value=6;
  const p=setup(d);assert.equal(p.run('MacroDashboard.charts.spread.data.datasets[1].data.every(v=>v===0)'),true);
  assert.match(p.nodes.get('macro-inversions').textContent,/2026-09/);assert.match(p.nodes.get('macro-spread-a').textContent,/inverted/);
  assert.equal(p.nodes.get('macro-spread-a').classList.contains('macro-inverted'),true);
  assert.equal(p.run('MacroDashboard.charts.spread.data.datasets[0].spanGaps'),false);
});
test('policy checkboxes and legend share state; common period and conventions are explicit',()=>{
  const p=setup(),check=p.nodes.get('macro-policy-cpi_yoy');check.checked=false;check.fire('change');
  let chart=p.run('MacroDashboard.charts.policy');assert.equal(chart.data.datasets[3].hidden,true);
  chart.options.plugins.legend.onClick(null,{datasetIndex:3});chart=p.run('MacroDashboard.charts.policy');
  assert.equal(check.checked,true);assert.equal(chart.data.datasets[3].hidden,false);
  assert.match(chart.options.plugins.tooltip.callbacks.afterLabel({datasetIndex:0,dataIndex:0}),/master effective date/);
  assert.match(chart.options.plugins.tooltip.callbacks.afterLabel({datasetIndex:3,dataIndex:0}),/annual percentage change/);
});
test('macro-versus-macro, regional-versus-macro and correlation-to-Explorer navigation work',()=>{
  const p=setup();
  for(const slug of ['bond_yield_2yr','anz_consumer_confidence'])assert(p.nodes.get('exp-regional').options.some(o=>o.value===slug));
  p.nodes.get('exp-regional').value='bond_yield_2yr';p.nodes.get('exp-macro').value='bond_yield_10yr';p.run('updateExplorer()');
  assert.equal(p.run("chartInstances['explorer-canvas'].data.datasets[0].data[0]"),2.148);
  p.run("plotInExplorer('anz_consumer_confidence','westpac_consumer_sentiment')");
  assert.equal(p.nodes.get('exp-regional').value,'anz_consumer_confidence');assert.equal(p.nodes.get('exp-macro').value,'westpac_consumer_sentiment');
  p.nodes.get('exp-regional').value='house_price';p.run('updateExplorer()');assert.equal(p.run("chartInstances['explorer-canvas'].data.datasets.length"),2);
  p.run('resetExplorer()');assert.equal(p.nodes.get('exp-regional').value,'house_price');
});
test('responsive configuration covers desktop and mobile; static CSS contracts are not rendered-layout tests',()=>{
  for(const width of [1280,768,360]){
    const p=setup(data,width);
    for(const chart of p.charts.filter(c=>c.canvas.id.startsWith('macro-'))){assert.equal(chart.options.responsive,true);assert.equal(chart.options.maintainAspectRatio,false);}
  }
  assert.match(css,/@media \(max-width:800px\)/);assert.match(css,/@media \(max-width:480px\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/min-height:44px/);
  assert.match(html,/name="viewport"/);assert.match(html,/chart\.js@4\.4\.3/);
  assert.match(html,/when a shifted observation is unavailable/);
});
