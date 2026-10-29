/* Pure calendar-month calculations. No data mutation, interpolation or lag fallback. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.MacroAnalysis = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MATURITIES = [2, 3, 5, 10];
  const POLICY = [
    {slug:'cash_rate', label:'Cash rate target — effective-dated snapshot', basis:'Master effective-date snapshot; not a monthly average', source:'RBA / existing master'},
    {slug:'bond_yield_2yr', label:'2Y government yield — monthly average', basis:'RBA F2.1 monthly average of daily end-of-day yields', source:'RBA F2.1'},
    {slug:'bond_yield_10yr', label:'10Y government yield — monthly average', basis:'RBA F2.1 monthly average of daily end-of-day yields', source:'RBA F2.1'},
    {slug:'cpi_yoy', label:'Headline CPI — annual change', basis:'Existing ABS monthly CPI indicator; annual percentage change', source:'ABS / existing master'}
  ];
  function monthKey(value) {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value)) throw new Error('Invalid calendar month/date');
    const key=value.slice(0,7), year=Number(key.slice(0,4)), mon=Number(key.slice(5,7));
    if (year<1900 || (value.length===10 && Number(value.slice(8))>new Date(Date.UTC(year,mon,0)).getUTCDate())) throw new Error('Invalid calendar date');
    return key;
  }
  function indexSeries(series) {
    const result=new Map();
    for (const point of series || []) {
      const key=monthKey(point.date);
      if (result.has(key)) throw new Error('Duplicate observation month '+key);
      if (point.value !== null && (typeof point.value!=='number' || !Number.isFinite(point.value))) throw new Error('Invalid numeric observation');
      result.set(key,{value:point.value, sourceDate:point.date});
    }
    return result;
  }
  function monthRange(from,to) {
    from=monthKey(from);to=monthKey(to);
    if (from>to) throw new Error('Start month must not be after end month');
    const a=Number(from.slice(0,4))*12+Number(from.slice(5,7))-1;
    const b=Number(to.slice(0,4))*12+Number(to.slice(5,7))-1;
    if (b-a>2400) throw new Error('Date range too large');
    return Array.from({length:b-a+1},(_,i)=>`${Math.floor((a+i)/12)}-${String((a+i)%12+1).padStart(2,'0')}`);
  }
  function valueAt(index,key) { return index.get(key)?.value ?? null; }
  function availableMonths(data,slugs) {
    const months=new Set();
    for (const slug of slugs) for (const [key,p] of indexSeries(data[slug]?.series)) if (p.value!==null) months.add(key);
    return [...months].sort();
  }
  function spread(two,ten) {
    if (two===null || ten===null) return null;
    if (!Number.isFinite(two) || !Number.isFinite(ten)) throw new Error('Invalid yield');
    return Number((100*(ten-two)).toFixed(8));
  }
  function curve(data,month) {
    month=monthKey(month);
    const points=MATURITIES.map(year=>({x:year,y:valueAt(indexSeries(data[`bond_yield_${year}yr`]?.series),month)}));
    return {month,points,spread:spread(points[0].y,points[3].y),
      observedCount:points.filter(p=>p.y!==null).length,missingMaturities:points.filter(p=>p.y===null).map(p=>p.x)};
  }
  function spreadHistory(data,from,to) {
    const two=indexSeries(data.bond_yield_2yr?.series),ten=indexSeries(data.bond_yield_10yr?.series);
    return monthRange(from,to).map(month=>{
      const value=spread(valueAt(two,month),valueAt(ten,month));
      return {month,value,inverted:value===null?null:value<0};
    });
  }
  function inversionPeriods(history) {
    const periods=[];let current=null,last=null;
    for (const row of history) {
      const key=monthKey(row.month);
      const consecutive=last===null || monthRange(last,key).length===2;
      if (row.value!==null && row.value<0) {
        if (!current || !consecutive) { current={from:key,to:key,months:1};periods.push(current); }
        else { current.to=key;current.months++; }
      } else current=null;
      last=key;
    }
    return periods;
  }
  function policyComparison(data,from,to) {
    const months=monthRange(from,to);
    return {months,series:POLICY.map(def=>{
      const index=indexSeries(data[def.slug]?.series);
      return {...def,points:months.map(month=>({month,value:valueAt(index,month),sourceDate:index.get(month)?.sourceDate ?? null}))};
    })};
  }
  return {MATURITIES,POLICY,monthKey,indexSeries,monthRange,valueAt,availableMonths,spread,curve,spreadHistory,inversionPeriods,policyComparison};
});
