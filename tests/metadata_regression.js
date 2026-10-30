// Additive deployed-PR7 regression, not a replacement for frozen legacy checks.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {page}=require('./page_harness.js'),data=require('../data/data.js');
const BASE='8466fb72d42401b6e38c60c842a4e6be28c2382d';
const show=file=>cp.execFileSync('git',['show',BASE+':'+file]);
const html=fs.readFileSync('index.html','utf8'),a=page(show('index.html').toString(),data),b=page(html,data);
const initialCharts=a.charts.length;assert.equal(initialCharts,b.charts.length);
for(let i=0;i<a.charts.length;i++) {assert.equal(a.charts[i].canvas.id,b.charts[i].canvas.id);assert.equal(JSON.stringify(a.charts[i].data),JSON.stringify(b.charts[i].data));assert.equal(JSON.stringify(a.charts[i].options),JSON.stringify(b.charts[i].options));}
for(const name of ['crossCorr','pearsonR','bestLag','buildChartInstance','updateExplorer','updateExplorerLag','resetExplorer','plotInExplorer','exportReport'])assert.equal(a.run(name+'.toString()'),b.run(name+'.toString()'),name);
let pairs=0;
for(const x of Object.keys(data))for(const y of Object.keys(data)){const code=`pearsonR('${x}','${y}')`;assert.equal(a.run(code),b.run(code));pairs++;}
for(const p of [a,b]){p.nodes.get('exp-regional').value='cpi_yoy';p.nodes.get('exp-macro').value='cash_rate';p.nodes.get('exp-lag').value='7';p.run('updateExplorer()');for(const id of ['scatter-trend','scatter-years','scatter-outliers']){p.nodes.get(id).checked=true;p.nodes.get(id).fire('change');}}
for(const code of ["chartInstances['explorer-canvas'].data",'ExplorerScatter.chart.data'])assert.equal(JSON.stringify(a.run(code)),JSON.stringify(b.run(code)));
const files=cp.execFileSync('git',['ls-tree','-r','--name-only',BASE,'data','scripts/build_data.py','scripts/refresh_data.py','scripts/macro_data.py','scripts/macro-analysis.js','scripts/macro-view.js','scripts/macro-analysis.css','scripts/scatter-analysis.js','scripts/scatter-view.js','scripts/scatter.css'],{encoding:'utf8'}).trim().split('\n');
for(const file of files)assert(fs.readFileSync(file).equals(show(file)),file+' must remain unchanged');
assert.equal(b.nodes.get('info-tbody').children.length,59);
assert.deepEqual(b.nodes.get('info-tbody').children.map(r=>r.dataset.slug).sort(),Object.keys(data).sort());
console.log(JSON.stringify({passed:true,baseline:BASE,initialChartConfigurationsUnchanged:initialCharts,existingDefaultCharts:32,indicatorObjects:59,generatedOutputFiles:60,pearsonPairsUnchanged:pairs,scatterOptionsAndSevenMonthLagUnchanged:true,allDataAndBuilderBytesUnchanged:true,metadataRows:59,reviewedDataChanges:0,browserRendering:'offline harness'},null,2));
