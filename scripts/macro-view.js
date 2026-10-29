/* Three additional charts, isolated from the 32 existing default line charts. */
(function (root) {
  'use strict';
  const charts={},COLORS=['#2a7f8f','#e8a020','#526d9a','#a94f55'];
  const el=id=>document.getElementById(id);
  let data,M,rangeMonths=[];
  const label=key=>new Date(key+'-01T00:00:00Z').toLocaleDateString('en-AU',{month:'short',year:'numeric',timeZone:'UTC'});
  const num=(value,places)=>value===null?'not available':value.toFixed(places);
  function fillSelect(id,months,value) {
    const select=el(id);select.innerHTML='';
    months.forEach(month=>{const option=document.createElement('option');option.value=month;option.textContent=label(month);select.appendChild(option);});
    select.value=value;select.disabled=months.length===0;
  }
  function draw(key,canvas,config) {
    if (charts[key])charts[key].destroy();
    charts[key]=new root.Chart(el(canvas),config);
  }
  function options(yTitle) {
    return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:11}}}},
      scales:{x:{ticks:{maxTicksLimit:8,maxRotation:0}},y:{title:{display:true,text:yTitle}}}};
  }
  function renderCurve() {
    const selected=[el('macro-month-a').value,el('macro-month-b').value];
    const curves=selected.map(month=>M.curve(data,month));
    ['macro-spread-a','macro-spread-b'].forEach((id,i)=>{
      const c=curves[i],text=`${label(c.month)}: 10Y–2Y ${num(c.spread,1)}${c.spread===null?'':' bp'}${c.spread===null?'':c.spread<0?' — inverted':' — not inverted'}`;
      el(id).textContent=text;el(id).classList.toggle('macro-inverted',c.spread!==null&&c.spread<0);
    });
    el('macro-curve-detail').textContent=curves.map(c=>`${label(c.month)}: `+c.points.map(p=>`${p.x}Y ${num(p.y,3)}${p.y===null?'':'%'}`).join('; ')+
      `. ${c.observedCount}/4 maturities available${c.missingMaturities.length?'; missing '+c.missingMaturities.map(n=>n+'Y').join(', '):''}.`).join(' ');
    const opts=options('Yield (% per annum; monthly average)');
    opts.interaction={mode:'nearest',intersect:false};
    opts.scales.x={type:'linear',min:2,max:10,title:{display:true,text:'Maturity (years)'},
      afterBuildTicks:axis=>{axis.ticks=M.MATURITIES.map(value=>({value}));},ticks:{callback:value=>value+'Y'}};
    opts.plugins.tooltip={callbacks:{title:items=>items.length?curves[items[0].datasetIndex].month+' · RBA F2.1 monthly average':'',
      label:ctx=>`${ctx.parsed.x}Y: ${num(ctx.parsed.y,3)}%`}};
    draw('curve','macro-curve-canvas',{type:'line',data:{datasets:curves.map((c,i)=>({label:`Month ${i===0?'A':'B'} — ${label(c.month)}`,
      data:c.points,borderColor:COLORS[i],backgroundColor:COLORS[i],borderDash:i?[6,4]:[],borderWidth:2,
      pointRadius:4,pointHoverRadius:6,tension:0,spanGaps:false,fill:false}))},options:opts});
  }
  function selectedRange() {
    const from=el('macro-from').value,to=el('macro-to').value;
    if (!rangeMonths.includes(from)||!rangeMonths.includes(to))throw new Error('Choose an available month.');
    M.monthRange(from,to);return {from,to};
  }
  function renderSpread(from,to) {
    const history=M.spreadHistory(data,from,to),periods=M.inversionPeriods(history);
    const negative=history.filter(row=>row.inverted).length,missing=history.filter(row=>row.value===null).length;
    el('macro-inversions').textContent=`${negative} inverted observation month${negative===1?'':'s'} in the selected range. `+
      (periods.length?'Observed inversion periods: '+periods.map(p=>p.from+(p.to===p.from?'':' to '+p.to)).join('; ')+'. ':'No observed inversion in this range. ')+
      (missing?`${missing} month${missing===1?'':'s'} missing; not treated as non-inverted.`:'');
    const opts=options('10Y–2Y spread (basis points)');opts.scales.y.beginAtZero=true;
    opts.plugins.tooltip={callbacks:{title:items=>items.length?history[items[0].dataIndex].month:'',
      label:ctx=>ctx.datasetIndex===1?'Zero reference':`${num(ctx.parsed.y,1)} bp${ctx.parsed.y<0?' — inverted':''}`}};
    draw('spread','macro-history-canvas',{type:'line',data:{labels:history.map(row=>row.month),datasets:[
      {label:'10Y–2Y spread',data:history.map(row=>row.value),borderColor:COLORS[0],borderWidth:2,
       pointRadius:2,pointBackgroundColor:history.map(row=>row.inverted?'#c0392b':COLORS[0]),tension:0,spanGaps:false,
       fill:{target:'origin',above:'rgba(42,127,143,.05)',below:'rgba(192,57,43,.17)'}},
      {label:'Zero reference',data:history.map(()=>0),borderColor:'#5a6b7d',borderDash:[5,4],borderWidth:1,pointRadius:0,fill:false}
    ]},options:opts});
  }
  function renderPolicy(from,to) {
    if (!from)({from,to}=selectedRange());
    const comparison=M.policyComparison(data,from,to);
    const opts=options('Percent (%) — measurement conventions differ');
    opts.plugins.legend.onClick=(event,item)=>{
      const checkbox=el('macro-policy-'+comparison.series[item.datasetIndex].slug);
      checkbox.checked=!checkbox.checked;renderPolicy(from,to);
    };
    opts.plugins.tooltip={callbacks:{title:items=>items.length?'Observation month '+comparison.months[items[0].dataIndex]:'',
      label:ctx=>`${ctx.dataset.label}: ${num(ctx.parsed.y,ctx.datasetIndex===0?2:3)}%`,
      afterLabel:ctx=>{
        const def=comparison.series[ctx.datasetIndex],point=def.points[ctx.dataIndex];
        return def.basis+(def.slug==='cash_rate'&&point.sourceDate?'; master effective date '+point.sourceDate:'');
      }}};
    const datasets=comparison.series.map((series,i)=>({label:series.label,data:series.points.map(point=>point.value),
      borderColor:COLORS[i],backgroundColor:COLORS[i],borderDash:i===3?[5,3]:[],borderWidth:2,
      pointRadius:2,tension:0,spanGaps:false,fill:false,hidden:!el('macro-policy-'+series.slug).checked}));
    el('macro-policy-detail').textContent=comparison.series.map((series,i)=>{
      const observed=series.points.filter(p=>p.value!==null),missing=series.points.length-observed.length;
      return `${series.label}: ${el('macro-policy-'+series.slug).checked?'shown':'hidden'}; latest in range ${observed.length?observed[observed.length-1].month:'not available'}; ${missing} missing month${missing===1?'':'s'}.`;
    }).join(' ');
    draw('policy','macro-policy-canvas',{type:'line',data:{labels:comparison.months,datasets},options:opts});
  }
  function renderPeriod() {
    try {
      const {from,to}=selectedRange();el('macro-range-message').textContent='';
      renderSpread(from,to);renderPolicy(from,to);
    } catch (error) {el('macro-range-message').textContent=error.message+' Charts retain the last valid range.';}
  }
  function init() {
    if (!el('macro-analysis'))return;
    M=root.MacroAnalysis;data=typeof CC_ECONOMIC_DATA==='undefined'?null:CC_ECONOMIC_DATA;
    if (!M||!data||!root.Chart) {el('macro-status').textContent='Charts could not load. Check that Chart.js and the local data/scripts are available.';return;}
    try {
      const months=M.availableMonths(data,M.MATURITIES.map(n=>`bond_yield_${n}yr`));
      rangeMonths=M.availableMonths(data,M.POLICY.map(p=>p.slug));
      if (!months.length||!rangeMonths.length)throw new Error('No verified observations are available.');
      const last=months[months.length-1],prior=(Number(last.slice(0,4))-1)+last.slice(4);
      fillSelect('macro-month-a',months,last);fillSelect('macro-month-b',months,months.includes(prior)?prior:months[Math.max(0,months.length-2)]);
      fillSelect('macro-from',rangeMonths,rangeMonths[Math.max(0,rangeMonths.length-12)]);
      fillSelect('macro-to',rangeMonths,rangeMonths[rangeMonths.length-1]);
      ['macro-month-a','macro-month-b'].forEach(id=>el(id).addEventListener('change',renderCurve));
      ['macro-from','macro-to'].forEach(id=>el(id).addEventListener('change',renderPeriod));
      M.POLICY.forEach(def=>el('macro-policy-'+def.slug).addEventListener('change',()=>renderPeriod()));
      el('macro-all-history').addEventListener('click',()=>{el('macro-from').value=rangeMonths[0];el('macro-to').value=rangeMonths[rangeMonths.length-1];renderPeriod();});
      renderCurve();renderPeriod();el('macro-status').textContent='Monthly observations; missing values remain gaps. Select months or a shared history range below.';
    } catch (error) {el('macro-status').textContent='Macroeconomic charts unavailable: '+error.message;}
  }
  root.MacroDashboard={init,renderCurve,renderPeriod,renderPolicy,charts};
  document.addEventListener('DOMContentLoaded',init);
})(typeof globalThis!=='undefined'?globalThis:this);
