const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../scripts/scatter-analysis.js');
const series=values=>values.map((value,i)=>({date:`2026-${String(i+1).padStart(2,'0')}-01`,value}));
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('strict calendar-month join matches different days, not row order',()=>{
  const r=S.join([{date:'2026-02-27',value:2},{date:'2026-01-07',value:1}],series([3,4]));
  assert.deepEqual(r.points.map(p=>[p.month,p.x,p.y]),[['2026-01',1,3],['2026-02',2,4]]);
  assert.equal(r.points[0].xDate,'2026-01-07');
});
test('zero preserved; null, undefined, nonfinite, strings and unpaired months excluded',()=>{
  const r=S.join(series([0,null,NaN,Infinity,undefined,'4',-2]),series([0,1,2,3,4,5]));
  assert.equal(r.points.length,1);assert.equal(r.points[0].x,0);assert.equal(r.excluded,6);
});
test('missing shifted months cannot fall back to unshifted/previous observations',()=>{
  assert.equal(S.join([{date:'2026-01-01',value:2}],[{date:'2026-02-01',value:3}]).points.length,0);
});
test('duplicates rejected on either side, even missing or outside selected range',()=>{
  const duplicate=[{date:'2026-01-01',value:null},{date:'2026-01-30',value:1}];
  assert.throws(()=>S.join(duplicate,series([1]),'2026-02','2026-03'),/Duplicate/);
  assert.throws(()=>S.join(series([1]),duplicate),/Duplicate/);
});
test('invalid calendar dates rejected; month-only dates accepted',()=>{
  for(const date of ['2026-02-30','2026-13-01','bad'])assert.throws(()=>S.index([{date,value:1}]),/Invalid/);
  assert.equal(S.join([{date:'2026-02',value:1}],series([2,3])).points[0].month,'2026-02');
});
test('inclusive ranges and invalid order',()=>{
  assert.deepEqual(S.join(series([1,2,3,4]),series([4,3,2,1]),'2026-02','2026-03').points.map(p=>p.month),['2026-02','2026-03']);
  assert.throws(()=>S.join([],[],'2026-03','2026-02'),/From/);
});
test('OLS positive and negative exact reference cases; no perfect-fit flags',()=>{
  for(const slope of [2,-2]){
    const r=S.statistics([0,1,2,3,4].map((x,i)=>({x,y:3+slope*x,month:String(i)})));
    near(r.slope,slope);near(r.intercept,3);near(r.r,Math.sign(slope));near(r.r2,1);
    assert.equal(r.residuals.filter(p=>p.flagged).length,0);
  }
});
test('nonperfect OLS and Pearson independently calculated reference',()=>{
  const r=S.statistics([1,2,3,4,5].map((x,i)=>({x,y:[2,4,5,4,5][i]})));
  near(r.slope,.6);near(r.intercept,2.2);near(r.r,.7745966692414834);near(r.r2,.6);
});
test('insufficient and constant series have explicit unavailable diagnostics',()=>{
  for(const n of [0,1,2,3]){const r=S.statistics(Array.from({length:n},(_,i)=>({x:i,y:i})));assert.equal(r.r,null);assert.match(r.reason,/4 paired/);}
  for(const points of [Array(5).fill({x:2,y:3}),series([1,2,3,4]).map(p=>({x:1,y:p.value})),series([1,2,3,4]).map(p=>({x:p.value,y:0}))]){
    const r=S.statistics(points);assert.equal(r.r,null);assert.equal(r.r2,null);assert.equal(r.line.length,0);assert.match(r.reason,/Constant/);
  }
});
test('residual threshold uses sample SD and retains all points including flagged',()=>{
  const points=Array.from({length:12},(_,i)=>({x:i,y:2*i+(i===6?20:0),month:String(i)}));
  const r=S.statistics(points),mean=points.reduce((s,p)=>s+p.y,0)/12;
  const errors=points.map(p=>p.y-(r.intercept+r.slope*p.x));
  const sd=Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/11);
  assert.equal(r.n,12);assert.equal(r.residuals[6].flagged,true);
  near(r.residuals[6].score,errors[6]/sd);assert.equal(S.THRESHOLD,1.75);
  for(let i=0;i<12;i++)assert.equal(r.residuals[i].flagged,Math.abs(errors[i]/sd)>=1.75);
  near(r.r2,1-errors.reduce((s,e)=>s+e*e,0)/points.reduce((s,p)=>s+(p.y-mean)**2,0));
});
test('calculation is deterministic and does not mutate inputs',()=>{
  const x=series([1,2,3,4]),y=series([4,3,2,1]),before=JSON.stringify([x,y]);
  assert.deepEqual(S.statistics(S.join(x,y).points),S.statistics(S.join(x,y).points));assert.equal(JSON.stringify([x,y]),before);
});
