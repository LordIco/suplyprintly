window.addEventListener('load',()=>{
  if(!document.body.classList.contains('admin-body'))return;
  const row=document.querySelector('.check-row');
  if(!row||document.querySelector('#showInPrintly'))return;
  const show=document.createElement('label');
  show.innerHTML='<input id="showInPrintly" type="checkbox"> Mostrar no Printly';
  const slotWrap=document.createElement('label');
  slotWrap.style.display='inline-flex';slotWrap.style.alignItems='center';slotWrap.style.gap='7px';
  slotWrap.innerHTML='Posição no app <select id="printlySlot"><option value="">—</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>';
  row.appendChild(show);row.appendChild(slotWrap);

  const slot=document.querySelector('#printlySlot');
  const sync=()=>{slot.disabled=!document.querySelector('#showInPrintly').checked;if(!document.querySelector('#showInPrintly').checked)slot.value='';};
  document.querySelector('#showInPrintly').addEventListener('change',sync);

  const originalPayload=window.formPayload;
  if(typeof originalPayload==='function'){
    window.formPayload=function(){
      const p=originalPayload();
      const enabled=!!document.querySelector('#showInPrintly')?.checked;
      p.show_in_printly=enabled;
      p.printly_slot=enabled?Number(document.querySelector('#printlySlot')?.value||0)||null:null;
      return p;
    };
  }

  const originalSetForm=window.setForm;
  if(typeof originalSetForm==='function'){
    window.setForm=function(p={}){
      originalSetForm(p);
      const showEl=document.querySelector('#showInPrintly');
      const slotEl=document.querySelector('#printlySlot');
      if(showEl)showEl.checked=!!p.show_in_printly;
      if(slotEl)slotEl.value=p.printly_slot?String(p.printly_slot):'';
      sync();
    };
  }

  const originalNew=window.newProduct;
  if(typeof originalNew==='function'){
    window.newProduct=function(){originalNew();const s=document.querySelector('#showInPrintly');const p=document.querySelector('#printlySlot');if(s)s.checked=false;if(p)p.value='';sync();};
  }

  const form=document.querySelector('#productForm');
  form?.addEventListener('submit',e=>{
    if(document.querySelector('#showInPrintly')?.checked&&!document.querySelector('#printlySlot')?.value){
      e.preventDefault();e.stopImmediatePropagation();
      if(typeof window.toast==='function')window.toast('Escolha a posição 1, 2 ou 3 para mostrar no Printly.','error');
      else alert('Escolha a posição 1, 2 ou 3 para mostrar no Printly.');
    }
  },true);

  const note=document.createElement('div');
  note.className='admin-note';
  note.style.marginTop='8px';
  note.textContent='O app mostra no máximo 3 ofertas. Se você usar uma posição já ocupada, o produto anterior sai automaticamente desse slot.';
  row.parentElement?.insertBefore(note,row.nextSibling);
  sync();
});
