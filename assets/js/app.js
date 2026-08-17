const state={products:[],query:'',category:'',store:'',sort:'featured',source:'demo'};
const $=s=>document.querySelector(s);
const money=v=>v==null||v===''?'Consulte':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const safe=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const catIcons={'Filamentos':'◉','Resinas':'◒','Impressoras':'▣','Peças':'⬡','Ferramentas':'⌁','Acabamento':'✦','Embalagens':'▱','Eletrônica':'⌁'};
function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function normalize(p){return {
  id:p.id, active:p.active!==false, featured:!!p.featured, category:p.category||'Outros', subcategory:p.subcategory||'',
  title:p.title||'Produto', brand:p.brand||'', store:p.store||'Parceiro', price:p.price==null?null:Number(p.price),
  oldPrice:p.old_price??p.oldPrice??null, image:p.image_url||p.image||'assets/img/product-filament.svg',
  description:p.description||'', tags:Array.isArray(p.tags)?p.tags:[], badge:p.badge||'',
  affiliateUrl:p.affiliate_url||p.affiliateUrl||'', sourceUrl:p.source_url||p.sourceUrl||'', sortOrder:p.sort_order||0
}}
async function loadProducts(){
  try{
    const backend=window.PrintlyBackend;
    if(backend?.configured && backend.client){
      const {data,error}=await backend.client.from('products').select('*').eq('active',true).order('featured',{ascending:false}).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
      if(error) throw error;
      state.products=(data||[]).map(normalize); state.source='online';
    }else{
      const r=await fetch('data/products.json',{cache:'no-store'}); state.products=(await r.json()).map(normalize); state.source='demo';
    }
  }catch(e){
    console.error(e); try{const r=await fetch('data/products.json',{cache:'no-store'});state.products=(await r.json()).map(normalize);state.source='demo'}catch{state.products=[]}
  }
  applyUrlFilters(); renderAll();
  const badge=$('#dataSourceBadge'); if(badge){badge.textContent=state.source==='online'?'Catálogo online':'Demonstração local';badge.classList.toggle('online',state.source==='online')}
}
function applyUrlFilters(){const p=new URLSearchParams(location.search);state.category=p.get('categoria')||'';state.query=p.get('busca')||p.get('material')||'';if(state.query){$('#heroSearch').value=state.query;$('#catalogSearch').value=state.query}}
function activeProducts(){return state.products.filter(p=>p.active!==false)}
function renderStats(){const p=activeProducts();$('#metricProducts').textContent=p.length;$('#metricCategories').textContent=new Set(p.map(x=>x.category).filter(Boolean)).size;$('#metricStores').textContent=new Set(p.map(x=>x.store).filter(Boolean)).size}
function renderCategories(){const p=activeProducts();const counts={};p.forEach(x=>counts[x.category]=(counts[x.category]||0)+1);const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);$('#categoryGrid').innerHTML=entries.map(([name,count])=>`<button class="category-card ${state.category===name?'active':''}" data-cat="${safe(name)}"><span class="category-icon">${catIcons[name]||'◇'}</span><strong>${safe(name)}</strong><small>${count} ${count===1?'item':'itens'}</small></button>`).join('');document.querySelectorAll('.category-card').forEach(b=>b.onclick=()=>{state.category=state.category===b.dataset.cat?'':b.dataset.cat;renderAll();document.querySelector('#ofertas').scrollIntoView({behavior:'smooth',block:'start'})})}
function renderStores(){const select=$('#storeFilter'),current=state.store;const stores=[...new Set(activeProducts().map(p=>p.store).filter(Boolean))].sort();select.innerHTML='<option value="">Todas as lojas</option>'+stores.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');select.value=current}
function filtered(){let p=activeProducts().slice();const q=state.query.trim().toLowerCase();if(q)p=p.filter(x=>[x.title,x.category,x.subcategory,x.brand,x.store,x.description,...(x.tags||[])].join(' ').toLowerCase().includes(q));if(state.category)p=p.filter(x=>x.category===state.category);if(state.store)p=p.filter(x=>x.store===state.store);const discount=x=>x.oldPrice&&x.price?((x.oldPrice-x.price)/x.oldPrice):0;if(state.sort==='price-asc')p.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));else if(state.sort==='price-desc')p.sort((a,b)=>(b.price??0)-(a.price??0));else if(state.sort==='discount')p.sort((a,b)=>discount(b)-discount(a));else if(state.sort==='name')p.sort((a,b)=>a.title.localeCompare(b.title));else p.sort((a,b)=>(Number(b.featured)-Number(a.featured))||((a.sortOrder||0)-(b.sortOrder||0))||discount(b)-discount(a));return p}
function productCard(p){const disc=p.oldPrice&&p.price&&p.oldPrice>p.price?Math.round((p.oldPrice-p.price)/p.oldPrice*100):0;const url=p.affiliateUrl||p.sourceUrl||'#';return `<article class="product-card"><div class="product-image"><img src="${safe(p.image)}" alt="${safe(p.title)}" loading="lazy" onerror="this.src='assets/img/product-filament.svg'"><div class="product-badges">${p.badge?`<span class="badge">${safe(p.badge)}</span>`:''}${disc?`<span class="badge discount">-${disc}%</span>`:''}</div></div><div class="product-body"><div class="product-meta">${safe(p.store)} · ${safe(p.category)}</div><h3 class="product-title">${safe(p.title)}</h3><p class="product-desc">${safe(p.description)}</p><div class="tag-row">${(p.tags||[]).slice(0,4).map(t=>`<span class="tag">${safe(t)}</span>`).join('')}</div><div class="price-area"><div>${p.oldPrice?`<span class="old-price">${money(p.oldPrice)}</span>`:'<span class="old-price"></span>'}<div class="price">${money(p.price)} ${p.price!=null?'<small>no parceiro</small>':''}</div></div><a class="buy-btn ${url==='#'?'disabled':''}" href="${safe(url)}" ${url==='#'?'aria-disabled="true"':'target="_blank" rel="sponsored noopener noreferrer"'}>Ver oferta ↗</a></div></div></article>`}
function renderProducts(){const p=filtered();$('#productGrid').innerHTML=p.map(productCard).join('');$('#resultCount').textContent=`${p.length} ${p.length===1?'produto':'produtos'}`;$('#productGrid').hidden=!p.length;$('#emptyState').hidden=!!p.length;let f=[];if(state.category)f.push(state.category);if(state.query)f.push(`“${state.query}”`);if(state.store)f.push(state.store);$('#activeFilter').textContent=f.length?'Filtro: '+f.join(' · '):'';document.querySelectorAll('.buy-btn:not(.disabled)').forEach(a=>a.addEventListener('click',()=>toast('Abrindo a oferta na loja parceira…')))}
function renderAll(){renderStats();renderCategories();renderStores();renderProducts()}
function clear(){state.query='';state.category='';state.store='';$('#heroSearch').value='';$('#catalogSearch').value='';$('#storeFilter').value='';history.replaceState(null,'',location.pathname);renderAll()}
$('#heroSearchBtn').onclick=()=>{state.query=$('#heroSearch').value;$('#catalogSearch').value=state.query;renderAll();document.querySelector('#ofertas').scrollIntoView({behavior:'smooth'})};
$('#heroSearch').addEventListener('keydown',e=>{if(e.key==='Enter')$('#heroSearchBtn').click()});
$('#catalogSearch').addEventListener('input',e=>{state.query=e.target.value;$('#heroSearch').value=state.query;renderProducts()});
$('#storeFilter').addEventListener('change',e=>{state.store=e.target.value;renderProducts()});
$('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderProducts()});
$('#clearFilters').onclick=clear;$('#emptyClear').onclick=clear;
loadProducts();
