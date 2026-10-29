/* One extra chart, with no changes to legacy datasets, correlation or lag behaviour. */
(function (root) {
  'use strict';
  const el=id=>document.getElementById(id);
  const COLORS=['#2a7f8f','#b86114','#6e59a5','#377a46','#a64767','#50697c'];
  let chart=null, data=null, pairKey=null, months=[];
  function clear() {if (chart) chart.destroy(); chart=null;}
  function fill(id, value) {
    const select=el(id);select.innerHTML='';
    for (const month of months) {const option=document.createElement('option');option.value=month;option.textContent=month;select.appendChild(option);}
    select.value=value;select.disabled=!months.length;
  }
  function resetRange() {el('scatter-from').value=months[0]||'';el('scatter-to').value=months[months.length-1]||'';}
  function render() {
    if (!data) return;
    try {
      const xSlug=el('exp-macro').value, ySlug=el('exp-regional').value;
      const x=data[xSlug], y=data[ySlug], key=xSlug+'|'+ySlug, S=root.ScatterAnalysis;
      if (!x || !y) throw new Error('Choose two available indicators.');
      // Validate the entire series, including months outside the selected range.
      const all=S.join(x.series,y.series);
      if (key!==pairKey) {
        const previous=[el('scatter-from').value,el('scatter-to').value];
        months=all.months;pairKey=key;
        fill('scatter-from',months.includes(previous[0])?previous[0]:months[0]||'');
        fill('scatter-to',months.includes(previous[1])?previous[1]:months[months.length-1]||'');
      }
      const from=el('scatter-from').value, to=el('scatter-to').value;
      const joined=S.join(x.series,y.series,from,to), stats=S.statistics(joined.points);
      const flags=el('scatter-outliers').checked, yearMode=el('scatter-years').checked;
      const years=[...new Set(joined.points.map(p=>p.month.slice(0,4)))].sort();
      const colorForYear=year=>COLORS[Number(year)%COLORS.length];
      const yearColor=p=>yearMode?colorForYear(p.month.slice(0,4)):'#2a7f8f';
      const points=joined.points.map((p,i)=>({...p,...stats.residuals[i]}));
      const count=stats.residuals.filter(p=>p.flagged).length;
      const number=n=>n===null?'unavailable':n.toFixed(3);
      el('scatter-stats').textContent=`Pearson r = ${number(stats.r)} · R² = ${number(stats.r2)} · n = ${stats.n} paired months`;
      el('scatter-status').textContent=(stats.reason?stats.reason+' ':'')+
        `${from||'No months'}${to?' to '+to:''}; ${joined.excluded} source month(s) excluded for missing/non-finite or unpaired values. `+
        (flags && stats.r!==null?`${count} exploratory residual flag(s); all points remain in the fit.`:'');
      el('scatter-provenance').textContent=`X: ${x.name} — ${x.source}; ${x.basis||x.freq}. Y: ${y.name} — ${y.source}; ${y.basis||y.freq}.`;
      const yearKey=el('scatter-year-key');yearKey.innerHTML='';
      if (yearMode) for (const year of years) {
        const item=document.createElement('span'), swatch=document.createElement('span'), text=document.createElement('span');
        item.classList.add('scatter-year');swatch.classList.add('scatter-swatch');swatch.style.backgroundColor=colorForYear(year);
        text.textContent=year;item.appendChild(swatch);item.appendChild(text);yearKey.appendChild(item);
      }
      const sets=[{label:'Paired months',data:points,backgroundColor:points.map(yearColor),
        pointStyle:points.map(p=>flags&&p.flagged?'triangle':'circle'),
        pointBorderColor:points.map(p=>flags&&p.flagged?'#9b3300':yearColor(p)),
        pointBorderWidth:points.map(p=>flags&&p.flagged?3:1),pointRadius:points.map(p=>flags&&p.flagged?7:5),pointHoverRadius:8}];
      if (el('scatter-trend').checked && stats.line.length) sets.push({type:'line',label:'OLS trend (all paired months)',data:stats.line,
        borderColor:'#526d9a',borderWidth:2,borderDash:[6,4],pointRadius:0,pointHitRadius:0,fill:false,tension:0});
      const formatted=(value,ind)=>formatVal(value,ind.format);
      const axis=ind=>ind.name+' ('+ind.unit+')';
      const config={type:'scatter',data:{datasets:sets},options:{responsive:true,maintainAspectRatio:false,
        events:['mousemove','mouseout','click','touchstart','touchmove'],interaction:{mode:'nearest',intersect:true},
        plugins:{legend:{display:sets.length>1},tooltip:{filter:item=>item.datasetIndex===0,
          callbacks:{title:items=>items.length===1?items[0].raw.month:items.length?'Coincident paired months':'',label:ctx=>{
            const p=ctx.raw;return ['Observation month: '+p.month,x.name+': '+formatted(p.x,x),y.name+': '+formatted(p.y,y),
              'Source dates: X '+p.xDate+'; Y '+p.yDate,
              ...(flags&&p.flagged?[`Exploratory residual: ${p.score.toFixed(2)} SD (not necessarily an error)`]:[])];
          }} }},
        scales:{x:{type:'linear',title:{display:true,text:axis(x)},ticks:{maxTicksLimit:6,callback:v=>formatted(v,x)}},
          y:{type:'linear',title:{display:true,text:axis(y)},ticks:{maxTicksLimit:6,callback:v=>formatted(v,y)}}}}};
      clear();chart=new root.Chart(el('scatter-canvas'),config);
    } catch (error) {
      clear();el('scatter-stats').textContent='Statistics unavailable';el('scatter-status').textContent='Scatter unavailable: '+error.message;
      el('scatter-year-key').textContent='';el('scatter-provenance').textContent='';
    }
  }
  function init() {
    if (!el('scatter-card')) return;
    data=typeof CC_ECONOMIC_DATA==='undefined'?null:CC_ECONOMIC_DATA;
    if (!data || !root.ScatterAnalysis || !root.Chart) {el('scatter-status').textContent='Scatter unavailable: data or chart scripts could not load.';data=null;return;}
    for (const id of ['scatter-from','scatter-to','scatter-trend','scatter-outliers','scatter-years']) el(id).addEventListener('change',render);
    el('scatter-all-history').addEventListener('click',()=>{resetRange();render();});
    render();
  }
  root.ExplorerScatter={init,render,get chart(){return chart;}};
  document.addEventListener('DOMContentLoaded',init);
})(typeof globalThis!=='undefined'?globalThis:this);
