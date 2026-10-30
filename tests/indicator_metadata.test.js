const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../scripts/indicator-metadata.js'),data=require('../data/data.js');
test('one metadata row for each of 59 active slugs, no orphan or CRB rows',()=>{
 const rows=M.rows(data);assert.equal(rows.length,59);assert.deepEqual(rows.map(r=>r.slug).sort(),Object.keys(data).sort());
 for(const s of ['crb_index','airbnb_occupancy','airbnb_revpal','vehicles_evs','interested_buyers'])assert(!rows.some(r=>r.slug===s));
});
test('published metadata remains unchanged, quarterly frequency and all requested fields retained',()=>{
 const before=JSON.stringify(data),rows=M.rows(data);
 for(const r of rows){for(const k of ['name','definition','source','geography','frequency','units','latestMonth'])assert(r[k]);assert.equal(r.latestMonth,data[r.slug].latestObservationMonth);}
 assert.equal(rows.filter(r=>r.frequency==='Quarterly').length,3);assert.equal(JSON.stringify(data),before);
});
test('only explicit safe HTTPS source references are linked; no credential-bearing or executable URLs',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,evil','http://example.org','https://u:secret@example.org','not a url',null,undefined])assert.equal(M.sourceLink(url),null);
 assert.equal(M.sourceLink('https://www.rba.gov.au/statistics/tables/'),'https://www.rba.gov.au/statistics/tables/');
 assert.equal(M.rows(data).filter(r=>r.sourceUrl).length,24);
});
test('missing provenance and definitions displayed honestly; no invented source or link',()=>{
 const [r]=M.rows({example:{series:[]}});assert.equal(r.source,'Source not documented');assert.equal(r.sourceUrl,null);
 assert.equal(r.definition,'Definition not documented');assert.match(r.provenanceNote,/not documented/);assert.equal(r.latestMonth,null);
 const us=M.rows(data).find(r=>r.slug==='us_fed_rate');assert.equal(us.definition,data.us_fed_rate.description);assert.equal(us.sourceUrl,null);
 const broken=M.rows({broken:null});assert.equal(broken.length,1);assert.equal(broken[0].slug,'broken');assert.equal(broken[0].source,'Source not documented');
});
test('latest observation ignores trailing blanks/nonfinite, retains zero and source dates',()=>{
 const r=M.latest({series:[{date:'2026-08-15',value:2},{date:'2026-09-30',value:0},{date:'2026-10-01',value:null},{date:'2026-11-01',value:NaN},{date:'2026-12-01',value:Infinity}],latestObservationMonth:'2026-09'});
 assert.deepEqual(r,{month:'2026-09',value:0,date:'2026-09-30',consistent:true,note:''});
});
test('missing month metadata derives from finite observations with an explicit note; never today',()=>{
 const r=M.latest({series:[{date:'2020-02-29',value:0}]});assert.equal(r.month,'2020-02');assert.match(r.note,/Computed/);
 assert.equal(M.latest({series:[{date:'2026-10-01',value:null}]}).month,null);
});
test('conflicting metadata, invalid dates and duplicate months fail honestly without removing the row',()=>{
 for(const ind of [{series:[{date:'2026-02-30',value:1}]},{series:[{date:'2026-09-01',value:1},{date:'2026-09-15',value:null}]}]){
  const rows=M.rows({test:ind});assert.equal(rows.length,1);assert.equal(rows[0].latestMonth,null);assert(rows[0].latestNote);
 }
});
test('deterministic sorting and search include slug, definition, geography, frequency and units',()=>{
 const rows=M.rows({b:{name:'B',description:'Second definition',geography:'NSW',freq:'quarterly',unit:'AUD',series:[]},a:{name:'A',series:[]}});
 assert.deepEqual(rows.map(r=>r.slug),['a','b']);for(const text of ['second definition','nsw','quarterly','aud'])assert(rows[1].search.includes(text));
});

test('latest pair is selected by calendar month, not row order, without filling later null months',()=>{
 const ind={series:[{date:'2026-10-01',value:null},{date:'2026-09-15',value:4.3},{date:'2026-07-01',value:99},{date:'2026-11-01',value:'5'},{date:'2026-12-01',value:false}],latestObservationMonth:'2026-09'};
 const before=JSON.stringify(ind),r=M.latest(ind);assert.equal(r.value,4.3);assert.equal(r.month,'2026-09');assert.equal(r.date,'2026-09-15');assert.equal(r.consistent,true);assert.equal(JSON.stringify(ind),before);
});
test('stored latest mismatch is explicitly flagged, derived month/value still come from the same observation',()=>{
 for(const declared of ['2026-08','2026-10','invalid']){
  const r=M.latest({series:[{date:'2026-09-01',value:4.3},{date:'2026-10-01',value:null}],latestObservationMonth:declared});
  assert.equal(r.month,'2026-09');assert.equal(r.value,4.3);assert.equal(r.consistent,false);assert.match(r.note,/Warning:.*conflicts/);
 }
});
test('eight categories partition all 59 published slugs once and retain original metadata content areas',()=>{
 const rows=M.rows(data);assert.equal(M.categories.length,8);assert.equal(new Set(rows.map(r=>r.category)).size,8);
 for(const r of rows){assert(M.categories.includes(r.category));assert.equal(r.latestValue,M.latest(data[r.slug]).value);assert.equal(r.latestConsistent,true);assert.equal(r.latestMonth,data[r.slug].latestObservationMonth);}
 assert.equal(rows.find(r=>r.slug==='cpi_yoy').contentArea,'Macroeconomic');assert.equal(rows.find(r=>r.slug==='house_price').contentArea,'Housing');
});
test('all-missing series has no latest value and does not invoke a numeric formatter',()=>{
 const [r]=M.rows({missing:{series:[{date:'2026-09-01',value:null},{date:'2026-10-01',value:NaN}]}},()=>{throw Error('must not format missing');});
 assert.equal(r.latestMonth,null);assert.equal(r.latestValue,null);assert.equal(r.latestDisplay,'Not available');
});
