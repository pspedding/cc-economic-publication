// Offline execution of actual page functions. Not a browser-rendering claim.
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),assert=require('assert');
const baseline=JSON.parse(fs.readFileSync('data/sources/legacy_dashboard.json','utf8'));
const current=require('../data/data.js');
const {page}=require('./page_harness.js');
const oldHtml=cp.execFileSync('git',['show','8b42cb4:index.html'],{encoding:'utf8'});
const a=page(oldHtml,baseline),b=page(fs.readFileSync('index.html','utf8'),current);
const oldLines=a.charts.filter(c=>c.config.type==='line'),newLines=b.charts.filter(c=>c.config.type==='line'&&!c.canvas.id.startsWith('macro-'));
assert.equal(newLines.length,oldLines.length,'Original default chart count unchanged');
for(let i=0;i<oldLines.length;i++)assert.equal(JSON.stringify(newLines[i].data),JSON.stringify(oldLines[i].data),'Existing line chart datasets preserved '+i);
let pairs=0;
for(const x of Object.keys(baseline))for(const y of Object.keys(baseline)){
  if(x==='crb_index'||y==='crb_index')continue;
  assert.equal(b.run(`pearsonR('${x}','${y}')`),a.run(`pearsonR('${x}','${y}')`));pairs++;
}
let lagChecks=0;
for(const x of ['house_price','unemployment','retail_total'])for(const y of ['cash_rate','bond_yield_10yr'])for(const lag of [0,1,6,12]){
  const code=`crossCorr(CC_ECONOMIC_DATA.${x}.series,CC_ECONOMIC_DATA.${y}.series,${lag})`;
  assert.equal(b.run(code),a.run(code));lagChecks++;
}
assert.equal(b.nodes.get('exp-macro').options.length,31);
for(const slug of ['bond_yield_2yr','anz_consumer_confidence','westpac_consumer_sentiment','nsw_household_total']){
  assert(b.nodes.get('exp-macro').options.some(o=>o.value===slug));
  b.nodes.get('exp-macro').value=slug;b.nodes.get('exp-lag').value='3';b.run('updateExplorer()');
  assert.equal(b.run("chartInstances['explorer-canvas'].data.datasets.length"),2);
}
b.nodes.get('exp-lag').value='0';b.run('resetExplorer()');
assert.equal(b.nodes.get('exp-lag').value,'0');
assert(b.run("pearsonR('house_price','bond_yield_2yr')")!==null);
assert(b.run("pearsonR('anz_consumer_confidence','westpac_consumer_sentiment')")!==null);
assert.equal(b.run("formatVal(null,'decimal_2')"),a.run("formatVal(null,'decimal_2')"));
assert.equal(b.run('exportReport.toString()'),a.run('exportReport.toString()'));
assert.equal(b.run('crossCorr.toString()'),a.run('crossCorr.toString()'));
assert.equal(b.run('buildChartInstance.toString()'),a.run('buildChartInstance.toString()'));
const stage2=page(cp.execFileSync('git',['show','e86e2a5:index.html'],{encoding:'utf8'}),current);
const stage2Lines=stage2.charts.filter(c=>c.config.type==='line');
for(let i=0;i<stage2Lines.length;i++)assert.equal(JSON.stringify(newLines[i].data),JSON.stringify(stage2Lines[i].data));
for(const fn of ['crossCorr','pearsonR','bestLag','buildChartInstance','exportReport'])assert.equal(b.run(fn+'.toString()'),stage2.run(fn+'.toString()'));
console.log(JSON.stringify({defaultLineChartsUnchanged:oldLines.length,legacyPearsonPairsUnchanged:pairs,
  legacyLagChecksUnchanged:lagChecks,macroOptions:31,newExplorerSelections:4,exportsUnchanged:true,
  stage2Checkpoint:'e86e2a5',newMacroCharts:3,realBrowserRendering:'offline harness only; see browser-status report'},null,2));
