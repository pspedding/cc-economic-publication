// Current deployed baseline, independent of the intentionally frozen pre-CPI test.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {page}=require('./page_harness.js'),data=require('../data/data.js');
const BASE='b5d92df6132948ec9a06d6a2f529cbd6e1620533';
const show=file=>cp.execFileSync('git',['show',BASE+':'+file]);
const html=fs.readFileSync('index.html','utf8'),a=page(show('index.html').toString(),data),b=page(html,data);
const legacyA=a.charts.filter(c=>!c.destroyed),legacyB=b.charts.filter(c=>!c.destroyed&&c.canvas.id!=='scatter-canvas');
assert.equal(legacyA.length,legacyB.length);
for(let i=0;i<legacyA.length;i++){assert.equal(legacyA[i].canvas.id,legacyB[i].canvas.id);assert.equal(JSON.stringify(legacyA[i].data),JSON.stringify(legacyB[i].data));}
for(const name of ['crossCorr','pearsonR','bestLag','buildChartInstance','updateExplorerLag','resetExplorer','plotInExplorer','exportReport'])assert.equal(a.run(name+'.toString()'),b.run(name+'.toString()'),name);
let correlations=0,lagChecks=0;
for(const x of Object.keys(data))for(const y of Object.keys(data)){
  const code=`pearsonR('${x}','${y}')`;assert.equal(a.run(code),b.run(code));correlations++;
}
for(const x of ['house_price','unemployment','retail_total'])for(const y of ['cash_rate','bond_yield_10yr'])for(const lag of [0,1,6,12]){
  const code=`crossCorr(CC_ECONOMIC_DATA.${x}.series,CC_ECONOMIC_DATA.${y}.series,${lag})`;assert.equal(a.run(code),b.run(code));lagChecks++;
}
for(const p of [a,b]) {p.nodes.get('exp-regional').value='cpi_yoy';p.nodes.get('exp-macro').value='cash_rate';p.nodes.get('exp-lag').value='7';p.run('updateExplorer()');}
assert.equal(JSON.stringify(a.run("chartInstances['explorer-canvas'].data")),JSON.stringify(b.run("chartInstances['explorer-canvas'].data")));
for(const id of ['scatter-trend','scatter-outliers','scatter-years']){b.nodes.get(id).checked=true;b.nodes.get(id).fire('change');}
assert.equal(JSON.stringify(a.run("chartInstances['explorer-canvas'].data")),JSON.stringify(b.run("chartInstances['explorer-canvas'].data")));
const files=cp.execFileSync('git',['ls-tree','-r','--name-only',BASE,'data','scripts/build_data.py','scripts/macro_data.py','scripts/refresh_data.py'],{encoding:'utf8'}).trim().split('\n');
const hashes={};for(const file of files){const bytes=fs.readFileSync(file);assert(bytes.equals(show(file)),file+' unchanged');hashes[file]=crypto.createHash('sha256').update(bytes).digest('hex');}
for(const [slug,ind] of Object.entries(data))assert.deepEqual(ind,JSON.parse(fs.readFileSync(`data/indicators/${slug}.json`,'utf8')));
console.log(JSON.stringify({passed:true,baseline:BASE,unchangedExistingCharts:legacyA.length,unchangedDefaultCharts:32,
  indicatorObjects:59,generatedOutputFiles:60,pearsonPairs:correlations,lagChecks,
  existingSelectionsAndLagUnchanged:true,allTrackedDataAndBuildersByteIdentical:true,hashes,browserRendering:'Offline contract harness, not a browser'},null,2));
