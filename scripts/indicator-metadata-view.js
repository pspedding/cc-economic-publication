/* Native expandable directory; published metadata and observations are read-only. */
(function(root){
  'use strict';
  const el=id=>document.getElementById(id);
  let entries=[],groups=[],previousQuery='',opener=null;
  function node(tag,text,parent){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(parent)parent.appendChild(n);return n;}
  function field(list,label,value){node('dt',label,list);return node('dd',value,list);}
  function filter(query){
    const needle=String(query||'').trim().toLowerCase();let visible=0;
    if(needle&&!previousQuery)for(const g of groups)g.savedOpen=g.node.open;
    for(const e of entries){e.node.hidden=!e.item.search.includes(needle);if(!e.node.hidden)visible++;}
    for(const g of groups){g.node.hidden=!g.entries.some(e=>!e.node.hidden);if(needle)g.node.open=!g.node.hidden;else if(previousQuery)g.node.open=g.savedOpen;}
    previousQuery=needle;el('info-count').textContent=`${visible} of ${entries.length} active indicators`;
  }
  function render(data){
    const body=el('info-tbody'),state=new Map(groups.map(g=>[g.name,{open:g.node.open,savedOpen:g.savedOpen}]));body.replaceChildren();entries=[];groups=[];
    const rows=root.IndicatorMetadata.rows(data,root.formatVal);
    for(const name of root.IndicatorMetadata.categories){
      const items=rows.filter(r=>r.category===name),group=node('details',undefined,body);group.classList.add('metadata-category');group.open=state.get(name)?.open||false;
      node('summary',`${name} (${items.length})`,group);
      const headings=node('div',undefined,group);headings.classList.add('metadata-columns');headings.setAttribute('aria-hidden','true');
      for(const label of ['Indicator','Source','Latest Period','Latest Value'])node('span',label,headings);
      const list=node('ul',undefined,group);list.classList.add('metadata-list');const g={name,node:group,entries:[],savedOpen:state.get(name)?.savedOpen||false};groups.push(g);
      for(const item of items){
        const li=node('li',undefined,list),entry=node('details',undefined,li);entry.dataset.slug=item.slug;entry.dataset.search=item.search;entry.classList.add('metadata-entry');
        const summary=node('summary',undefined,entry);summary.classList.add('metadata-columns');
        for(const [label,value] of [['Indicator',item.name],['Source',item.source],['Latest Period',item.latestMonth||'Not available'],['Latest Value',item.latestDisplay]]){
          const cell=node('span',undefined,summary);node('span',label+': ',cell).classList.add('metadata-sr-only');node('span',value,cell);
          if(label==='Latest Period'&&item.latestNote.startsWith('Warning:'))node('span',' — latest-period mismatch',cell).classList.add('metadata-warning');
        }
        const dl=node('dl',undefined,entry);
        for(const [label,value] of [['Indicator',item.name],['Identifier',item.slug],['Content Area',item.contentArea],['Definition',item.definition],['Measurement basis',item.basis||'Not documented'],['Source',item.source],['Frequency',item.frequency],['Scope',item.geography],['Units',item.units],['Latest Period',item.latestMonth||'Not available'],['Latest Value',item.latestDisplay],['Source observation date',item.latestDate||'Not available']])field(dl,label,value);
        if(item.latestNote)field(dl,'Latest observation check',item.latestNote).classList.add('metadata-warning');
        const source=field(dl,'Source link',item.sourceUrl?'':'No published source reference; provenance details not documented');
        if(item.sourceUrl){const a=node('a','Source reference',source);a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';}
        if(item.sourceSeriesId)field(dl,'Source series ID',item.sourceSeriesId);
        const e={node:entry,item};entries.push(e);g.entries.push(e);
      }
    }
    filter(el('info-search').value);
  }
  function toggle(){
    const overlay=el('info-overlay'),opening=!overlay.classList.contains('open');overlay.classList.toggle('open',opening);
    if(opening){opener=document.activeElement;el('info-search').focus();}else if(opener)opener.focus();
  }
  document.addEventListener('keydown',event=>{
    const overlay=el('info-overlay');if(!overlay.classList.contains('open'))return;
    if(event.key==='Escape'){event.preventDefault();toggle();}
    if(event.key==='Tab'){
      const focusable=Array.from(overlay.querySelectorAll('button,input,summary,a[href]')).filter(n=>!n.disabled&&n.offsetParent!==null);
      const first=focusable[0],last=focusable.at(-1);if(!first)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  root.IndicatorMetadataView={render,filter,toggle};
})(typeof globalThis!=='undefined'?globalThis:this);
