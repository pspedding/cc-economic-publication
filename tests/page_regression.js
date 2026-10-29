// Offline execution of actual page functions. Not a browser-rendering claim.
const fs=require('fs'),vm=require('vm'),cp=require('child_process'),assert=require('assert');
const baseline=JSON.parse(fs.readFileSync('data/sources/legacy_dashboard.json','utf8'));
const current=require('../data/data.js');
function page(html,data){
  const nodes=new Map(), charts=[];
  function element(){return {value:'',children:[],style:{},parentElement:{style:{}},classList:{add(){},remove(){},toggle(){}},
    appendChild(o){this.children.push(o);if(!this.value&&o.value)this.value=o.value;},
    get options(){return this.children;},cloneNode(){const n=element();n.value=this.value;n.textContent=this.textContent;return n;},
    scrollIntoView(){},addEventListener(){},getBoundingClientRect(){return {top:0,height:100};}};}
  function node(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
  let initialize;
  const document={getElementById:node,createElement:element,querySelectorAll(){return [];},querySelector(){return null;},
    addEventListener(name,fn){if(name==='DOMContentLoaded')initialize=fn;}};
  node('exp-lag').value='0';
  class Chart{constructor(canvas,config){this.data=config.data;this.options=config.options;this.config=config;charts.push(this);}destroy(){}update(){}}
  Chart.defaults={font:{}};
  const ctx=vm.createContext({CC_ECONOMIC_DATA:data,document,Chart,console,Date,Math,
    window:{print(){},addEventListener(){},scrollTo(){}},alert(){},IntersectionObserver:class{observe(){}}});
  const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  vm.runInContext(inline,ctx);initialize();return {ctx,nodes,charts,run:code=>vm.runInContext(code,ctx)};
}
const oldHtml=cp.execFileSync('git',['show','8b42cb4:index.html'],{encoding:'utf8'});
const a=page(oldHtml,baseline),b=page(fs.readFileSync('index.html','utf8'),current);
assert.equal(b.charts.length,a.charts.length,'No default chart removed or added');
const oldLines=a.charts.filter(c=>c.config.type==='line'),newLines=b.charts.filter(c=>c.config.type==='line');
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
console.log(JSON.stringify({defaultLineChartsUnchanged:oldLines.length,legacyPearsonPairsUnchanged:pairs,
  legacyLagChecksUnchanged:lagChecks,macroOptions:31,newExplorerSelections:4,exportsUnchanged:true,
  realBrowserRendering:'not verified: browser navigation blocked by policy'},null,2));
