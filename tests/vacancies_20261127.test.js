const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.join(__dirname,'..');
const data=require(path.join(ROOT,'data/data.js')),base=require(path.join(ROOT,'data/sources/approved_refinements_20261126.json'));
const {page}=require(path.join(ROOT,'tests/page_harness.js')),M=require(path.join(ROOT,'scripts/indicator-metadata.js'));
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),audit=require('./fixtures/vacancies_20261127.json'),ex=audit;
const expected=['Unemployment Rate','Job Vacancies','Jobseeker Recipients','Avg House Price','Avg Unit Price','Avg Weekly Rent','Residential Vacancies','Total Retail Spend','RBA Cash Rate','CPI Inflation — Headline (YoY)','New Vehicles (Mo)','STRA Revenue'];
test('exact twelve KPI cards in requested order and correctly formatted latest values',()=>{
 for(const width of [1440,390]){const p=page(html,data,{width}),render=p.nodes.get('scorecard').innerHTML;
  const labels=[...render.matchAll(/class="kpi-label">([^<]+)</g)].map(m=>m[1]);assert.deepEqual(labels,expected);
  const values=[...render.matchAll(/class="kpi-value">([^<]+)</g)].map(m=>m[1]);assert.equal(values.length,12);assert.equal(values[6],'366');assert(!values[6].includes('%'));assert(values[4].startsWith('$'));
  for(let i=0;i<audit.kpi_order.length;i++){const slug=audit.kpi_order[i],last=data[slug].series.filter(p=>p.value!==null).at(-1);assert.equal(values[i],p.run(`formatVal(${last.value},'${data[slug].format}')`));}
 }
});
test('vacancy rate remains separate percentage time-series chart; no extra Housing chart added',()=>{
 const p=page(html,data);const housing=p.run('SECTION_MAP.housing');assert(housing.includes('vacancy_rate'));assert(!housing.includes('residential_vacancies'));
 const chart=p.run("chartInstances['vacancy_rate']");assert(chart);assert.equal(chart.data.datasets[0].label,'Residential Vacancy Rate');assert.equal(p.run("formatVal(0.96,'percent_direct')"),'0.96%');
 assert.equal(chart.data.datasets[0].data.filter(v=>v!==null).length,55);assert.equal(chart.data.datasets[0].data.at(-2),.96);
 assert(!p.run("chartInstances['residential_vacancies']"));
});
test('count and rate use exact workbook observations with trailing November null, no conversion or fill',()=>{
 assert.deepEqual(data.vacancy_rate.series,ex.rate_series);assert.deepEqual(data.residential_vacancies.series,ex.count_series);
 for(const slug of ['vacancy_rate','residential_vacancies']){const d=data[slug];assert.equal(d.series.length,56);assert.equal(d.series.filter(p=>p.value!==null).length,55);assert.equal(d.series.at(-1).value,null);assert(M.latest(d).consistent);assert.equal(d.latestObservationMonth,'2026-10');}
 assert.equal(data.residential_vacancies.unit,'count');assert.equal(data.residential_vacancies.format,'integer');assert(!data.residential_vacancies.sourceUrl);assert.equal(data.vacancy_rate.unit,'%');
});
test('all 66 unrelated existing objects including retail/CPI/EV are unchanged; inventory adds one ID',()=>{
 assert.deepEqual(Object.keys(data).sort(),[...Object.keys(base),'residential_vacancies'].sort());assert.equal(Object.keys(data).length,68);
 for(const slug of Object.keys(base))if(slug!=='vacancy_rate')assert.deepEqual(data[slug],base[slug],slug);
 const before={...base.vacancy_rate},after={...data.vacancy_rate};for(const x of ['series','latestObservationMonth']){delete before[x];delete after[x];}assert.deepEqual(after,before);
});
test('all 69 active output files match indicator objects and metadata remains current',()=>{
 for(const [slug,ind]of Object.entries(data)){assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT,'data/indicators',slug+'.json'))),ind);assert(M.latest(ind).consistent,slug);}
 assert.equal(M.rows(data).length,68);
});
test('count available in Explorer and metadata; trimmed mean retains fifth position',()=>{
 const p=page(html,data);assert(p.nodes.get('exp-regional').options.some(o=>o.value==='residential_vacancies'));
 for(const id of ['exp-regional','exp-macro'])assert.equal(p.nodes.get(id).options[4].value,'cpi_trimmed_mean_yoy');
 const row=M.rows(data).find(r=>r.slug==='residential_vacancies');assert.equal(row.name,'Residential Vacancies');assert.equal(row.category,'Housing & Construction');assert.equal(row.latestValue,366);
 p.nodes.get('exp-regional').value='residential_vacancies';p.nodes.get('exp-macro').value='cash_rate';p.run('updateExplorer()');assert(p.run("chartInstances['explorer-canvas']"));assert.equal(p.run('ExplorerScatter.chart.data.datasets[0].data.length'),55);
});
test('all analytical module bytes and math functions unchanged from production baseline',()=>{
 for(const name of fs.readdirSync(path.join(ROOT,'scripts')).filter(n=>/\.(js|css)$/.test(n))){const old=cp.execFileSync('git',['show','2584145:scripts/'+name],{cwd:ROOT});assert(fs.readFileSync(path.join(ROOT,'scripts',name)).equals(old),name);}
 const priorHtml=cp.execFileSync('git',['show','2584145:index.html'],{cwd:ROOT,encoding:'utf8'}),a=page(priorHtml,base),b=page(html,data);
 for(const fn of ['pearsonR','crossCorr','bestLag','buildChartInstance','updateExplorer','updateExplorerLag','resetExplorer','formatVal','buildScorecard'])assert.equal(a.run(fn+'.toString()'),b.run(fn+'.toString()'),fn);
});
test('vacancy audit explicitly reconciles 50 historical revisions and one new month',()=>{assert.equal(audit.rate_changes.length,51);assert.equal(audit.rate_changes.filter(c=>c.old!==null).length,50);assert.deepEqual(audit.rate_changes.at(-1),{month:'2026-10',old:null,new:.96});assert.equal(audit.formula_caches_verified,65);});
