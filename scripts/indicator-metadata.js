/* Published-object metadata only. Never reads a workbook or changes observations. */
(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./macro-analysis.js'));
  else root.IndicatorMetadata=factory(root.MacroAnalysis);
})(typeof globalThis!=='undefined'?globalThis:this,function(M){
  'use strict';
  const text=value=>typeof value==='string'&&value.trim()?value.trim():'';
  function sourceLink(value){
    try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}
    catch {return null;}
  }
  function latest(ind){
    const seen=new Set(),observed=[];
    try {
      for(const p of ind.series||[]){
        const key=M.monthKey(p.date);
        if(seen.has(key))return {month:null,note:'Duplicate observation month; latest month not verified'};
        seen.add(key);
        if(typeof p.value==='number'&&Number.isFinite(p.value))observed.push(key);
      }
    } catch {return {month:null,note:'Invalid observation date; latest month not verified'};}
    if(!observed.length)return {month:null,note:'No finite published observations'};
    const actual=observed.sort().at(-1),declared=text(ind.latestObservationMonth);
    if(!declared)return {month:actual,note:'Computed from published observations; latest-month metadata not documented'};
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(declared)||declared!==actual)return {month:null,note:'Latest-month metadata conflicts with published observations'};
    return {month:declared,note:''};
  }
  function rows(data){
    return Object.entries(data).map(([slug,value])=>{
      const ind=value&&typeof value==='object'?value:{};
      const l=latest(ind),link=sourceLink(ind.sourceUrl);
      const row={slug,name:text(ind.name)||slug,definition:text(ind.description)||'Definition not documented',
        basis:text(ind.basis),source:text(ind.source)||'Source not documented',sourceUrl:link,
        sourceSeriesId:text(ind.sourceSeriesId),geography:text(ind.geography)||'Not documented',
        frequency:({monthly:'Monthly',quarterly:'Quarterly',annual:'Annual'})[ind.freq]||text(ind.freq)||'Not documented',
        units:text(ind.unit)||'Not documented',latestMonth:l.month,latestNote:l.note,
        provenanceNote:link?'':'No published source reference; provenance details not documented'};
      row.search=Object.values(row).filter(v=>typeof v==='string').join(' ').toLowerCase();
      return row;
    }).sort((a,b)=>a.name.localeCompare(b.name,'en-AU')||a.slug.localeCompare(b.slug,'en-AU'));
  }
  return {sourceLink,latest,rows};
});
