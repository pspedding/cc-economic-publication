/* Idempotent, escaped rendering of the active published inventory. */
(function(root){
  'use strict';
  const el=id=>document.getElementById(id);
  function cell(row,value){const td=document.createElement('td');td.textContent=value;row.appendChild(td);return td;}
  function detail(parent,value){if(!value)return;const note=document.createElement('small');note.classList.add('metadata-detail');note.textContent=value;parent.appendChild(note);}
  function filter(query){
    const needle=String(query||'').toLowerCase();let visible=0;
    for(const row of el('info-tbody').children){const show=row.dataset.search.includes(needle);row.style.display=show?'':'none';if(show)visible++;}
    el('info-count').textContent=`${visible} of ${el('info-tbody').children.length} active indicators`;
  }
  function render(data){
    const body=el('info-tbody');body.replaceChildren();
    for(const item of root.IndicatorMetadata.rows(data)){
      const tr=document.createElement('tr');tr.dataset.slug=item.slug;tr.dataset.search=item.search;
      detail(cell(tr,item.name),item.slug);
      const definition=cell(tr,item.definition);
      if(item.basis&&item.basis!==item.definition)detail(definition,'Basis: '+item.basis);
      const source=cell(tr,item.source);
      if(item.sourceUrl){const a=document.createElement('a');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Source reference';source.appendChild(document.createElement('br'));source.appendChild(a);}
      detail(source,item.sourceSeriesId);detail(source,item.provenanceNote);
      cell(tr,item.geography);cell(tr,item.frequency);cell(tr,item.units);
      detail(cell(tr,item.latestMonth||'Not available'),item.latestNote);body.appendChild(tr);
    }
    filter(el('info-search').value);
  }
  root.IndicatorMetadataView={render,filter};
})(typeof globalThis!=='undefined'?globalThis:this);
