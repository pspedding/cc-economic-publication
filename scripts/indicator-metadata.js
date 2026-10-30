/* Published-object metadata only. Never reads a workbook or changes observations. */
(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./macro-analysis.js'));
  else root.IndicatorMetadata=factory(root.MacroAnalysis);
})(typeof globalThis!=='undefined'?globalThis:this,function(M){
  'use strict';
  const text=value=>typeof value==='string'&&value.trim()?value.trim():'';
  const categories=['Economy & Labour','Housing & Construction','Transport','Tourism','Consumer & Business Confidence','Interest Rates & Monetary Policy','Markets & Commodities','NSW Household Spending & Retail'];
  const areas={economy:'Economy & Labour',housing:'Housing',transport:'Transport',tourism:'Tourism',context:'Macroeconomic'};
  function category(slug,ind){
    if (/^(anz_|westpac_|business_confidence)/.test(slug))return categories[4];
    if (/^nsw_(household|retail)_/.test(slug))return categories[7];
    if (['cash_rate','cpi_yoy','us_fed_rate','bond_yield_2yr','bond_yield_3yr','bond_yield_5yr','bond_yield_10yr','bond_spread_10y_2y'].includes(slug))return categories[5];
    return ({economy:categories[0],housing:categories[1],transport:categories[2],tourism:categories[3]})[ind.section]||categories[6];
  }
  function sourceLink(value){
    try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}
    catch {return null;}
  }
  function latest(ind){
    const seen=new Set(),observed=[];
    const unavailable=note=>({month:null,value:null,date:null,consistent:false,note});
    try {
      for(const p of ind.series||[]){
        const key=M.monthKey(p.date);
        if(seen.has(key))return unavailable('Duplicate observation month; latest observation not verified');
        seen.add(key);
        if(typeof p.value==='number'&&Number.isFinite(p.value))observed.push({month:key,value:p.value,date:p.date});
      }
    } catch {return unavailable('Invalid observation date; latest observation not verified');}
    if(!observed.length)return unavailable('No finite published observations');
    const actual=observed.sort((a,b)=>a.month.localeCompare(b.month)).at(-1),declared=text(ind.latestObservationMonth);
    if(!declared)return {...actual,consistent:false,note:'Computed from published observations; latest-month metadata not documented'};
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(declared)||declared!==actual.month)return {...actual,consistent:false,note:`Warning: stored latestObservationMonth (${declared}) conflicts with derived period (${actual.month})`};
    return {...actual,consistent:true,note:''};
  }
  function rows(data,formatter=String){
    return Object.entries(data).map(([slug,value])=>{
      const ind=value&&typeof value==='object'?value:{};
      const l=latest(ind),link=sourceLink(ind.sourceUrl);
      const unit=text(ind.unit),formatted=l.value===null?'Not available':formatter(l.value,ind.format);
      const row={slug,name:text(ind.name)||slug,definition:text(ind.description)||'Definition not documented',
        category:category(slug,ind),contentArea:text(ind.contentArea)||areas[ind.section]||'Not documented',
        basis:text(ind.basis),source:text(ind.source)||'Source not documented',sourceUrl:link,
        sourceSeriesId:text(ind.sourceSeriesId),geography:text(ind.geography)||'Not documented',
        frequency:({monthly:'Monthly',quarterly:'Quarterly',annual:'Annual'})[ind.freq]||text(ind.freq)||'Not documented',
        units:unit||'Not documented',latestMonth:l.month,latestValue:l.value,latestDate:l.date,latestConsistent:l.consistent,latestNote:l.note,
        latestDisplay:l.value===null?formatted:formatted+(unit&&!(unit==='%'&&formatted.endsWith('%'))?' '+unit:''),
        provenanceNote:link?'':'No published source reference; provenance details not documented'};
      row.search=Object.values(row).filter(v=>typeof v==='string').join(' ').toLowerCase();
      return row;
    }).sort((a,b)=>a.name.localeCompare(b.name,'en-AU')||a.slug.localeCompare(b.slug,'en-AU'));
  }
  return {sourceLink,latest,rows,categories};
});
