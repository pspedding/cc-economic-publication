const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/macro-analysis.js'),data=require('../data/data.js');
const fixture=(points)=>({series:points.map(([date,value])=>({date,value}))});
test('calendar keys and year boundaries do not depend on timezone',()=>{
  assert.equal(M.monthKey('2022-04-06'),'2022-04');
  assert.deepEqual(M.monthRange('2025-12','2026-02'),['2025-12','2026-01','2026-02']);
  for(const key of ['2026-13','2026-02-30','Sep 2026']) assert.throws(()=>M.monthKey(key));
  assert.throws(()=>M.monthRange('2026-09','2026-08'));
});
test('ambiguous duplicate months and invalid numeric observations fail closed',()=>{
  assert.throws(()=>M.indexSeries([{date:'2026-09-01',value:4},{date:'2026-09-30',value:5}]));
  for(const value of [NaN,Infinity,'4',false])assert.throws(()=>M.indexSeries([{date:'2026-09',value}]));
});
test('historical curve selection uses exactly four supplied maturities',()=>{
  const a=M.curve(data,'2026-09'),b=M.curve(data,'2022-04');
  assert.deepEqual(a.points,[{x:2,y:4.922},{x:3,y:4.91},{x:5,y:4.958},{x:10,y:5.283}]);
  assert.equal(a.spread,36.1);assert.equal(b.spread,86);assert.notDeepEqual(a.points,b.points);
  assert.deepEqual(a.points.map(p=>p.x),[2,3,5,10]);
});
test('same-month comparison is valid; missing maturity is a gap, not interpolated',()=>{
  assert.deepEqual(M.curve(data,'2026-09'),M.curve(data,'2026-09'));
  const d={...data,bond_yield_5yr:fixture([])},c=M.curve(d,'2026-09');
  assert.equal(c.points[2].y,null);assert.equal(c.observedCount,3);assert.deepEqual(c.missingMaturities,[5]);
  const unavailable=M.curve({},'2026-09');assert.equal(unavailable.spread,null);assert.equal(unavailable.observedCount,0);
});
test('spread uses basis points, handles zero and negative rates, and never fills gaps',()=>{
  assert.equal(M.spread(5,4.5),-50);assert.equal(M.spread(0,0),0);assert.equal(M.spread(-1,-0.5),50);
  assert.equal(M.spread(null,5),null);assert.equal(M.spread(5,null),null);
});
test('calculated spreads match every verified generated observation',()=>{
  const history=M.spreadHistory(data,'2022-04','2026-09');
  const verified=M.indexSeries(data.bond_spread_10y_2y.series);
  assert.equal(history.length,54);
  for(const row of history)assert.equal(row.value,M.valueAt(verified,row.month));
});
test('inversion periods exclude zero, positive and missing months; do not bridge gaps',()=>{
  const rows=[['2026-01',-1],['2026-02',-5],['2026-03',null],['2026-04',-2],['2026-05',0],['2026-06',3],['2026-08',-1]];
  assert.deepEqual(M.inversionPeriods(rows.map(([month,value])=>({month,value}))),[
    {from:'2026-01',to:'2026-02',months:2},{from:'2026-04',to:'2026-04',months:1},{from:'2026-08',to:'2026-08',months:1}]);
});
test('spread history includes missing months and marks inversion explicitly',()=>{
  const d={bond_yield_2yr:fixture([['2026-01-15',5],['2026-03-01',5]]),bond_yield_10yr:fixture([['2026-01-31',4],['2026-03-01',6]])};
  assert.deepEqual(M.spreadHistory(d,'2026-01','2026-03'),[
    {month:'2026-01',value:-100,inverted:true},{month:'2026-02',value:null,inverted:null},{month:'2026-03',value:100,inverted:false}]);
});
test('policy alignment retains effective date and CPI convention without shifting by publication date',()=>{
  const p=M.policyComparison(data,'2022-04','2022-05');
  assert.deepEqual(p.months,['2022-04','2022-05']);
  assert.equal(p.series[0].points[0].sourceDate,'2022-04-06');
  assert.equal(p.series[2].points[0].month,'2022-04');
  assert.match(p.series[0].basis,/not a monthly average/);assert.match(p.series[3].basis,/annual percentage change/);
});
test('policy missing yields/CPI remain null even if another series has the month',()=>{
  const p=M.policyComparison(data,'2026-09','2026-10');
  assert.equal(p.series[0].points[1].value,4.6);
  for(const i of [1,2,3])assert.equal(p.series[i].points[1].value,null);
});
test('all calculations leave generated data untouched',()=>{
  const before=JSON.stringify(data);M.curve(data,'2026-09');M.spreadHistory(data,'2022-04','2026-09');M.policyComparison(data,'2022-04','2026-10');
  assert.equal(JSON.stringify(data),before);
});
