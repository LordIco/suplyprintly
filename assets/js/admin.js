let products=[],selectedId=null,currentUser=null;
const $=s=>document.querySelector(s);
const client=()=>window.PrintlyBackend?.client;
const configured=()=>Boolean(window.PrintlyBackend?.configured && client());
const money=v=>v==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const safe=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function adminImageSrc(src){src=String(src||'../assets/img/product-filament.svg');return src.startsWith('assets/')?'../'+src:src}
function toast(msg,type=''){const t=$('#toast');t.textContent=msg;t.className='toast show '+type;setTimeout(()=>t.className='toast',2800)}
function setBusy(on){document.body.classList.toggle('is-busy',on);document.querySelectorAll('button').forEach(b=>{if(b.dataset.noLock!=='1')b.disabled=on})}
function parsePrice(v){if(v==null||v==='')return null;const s=String(v).trim().replace(/R\$/g,'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null}
function formPayload(){return {
  title:$('#title').value.trim(), category:$('#category').value, subcategory:$('#subcategory').value.trim()||null,
  brand:$('#brand').value.trim()||null, store:$('#store').value.trim()||null, price:parsePrice($('#price').value),
  old_price:parsePrice($('#oldPrice').value), image_url:$('#image').value.trim()||'assets/img/product-filament.svg',
  description:$('#description').value.trim()||null, tags:$('#tags').value.split(',').map(x=>x.trim()).filter(Boolean),
  badge:$('#badge').value.trim()||null, source_url:$('#sourceUrl').value.trim()||null,
  affiliate_url:$('#affiliateUrl').value.trim()||null, active:$('#active').checked, featured:$('#featured').checked,
  sort_order:Number($('#sortOrder').value||0)
}}
function setForm(p={}){$('#id').value=p.id||'';$('#title').value=p.title||'';$('#category').value=p.category||'Filamentos';$('#subcategory').value=p.subcategory||'';$('#brand').value=p.brand||'';$('#store').value=p.store||'';$('#price').value=p.price!=null?String(p.price).replace('.',','):'';$('#oldPrice').value=p.old_price!=null?String(p.old_price).replace('.',','):'';$('#image').value=p.image_url||'';$('#description').value=p.description||'';$('#tags').value=(p.tags||[]).join(', ');$('#badge').value=p.badge||'';$('#sourceUrl').value=p.source_url||'';$('#affiliateUrl').value=p.affiliate_url||'';$('#sortOrder').value=p.sort_order||0;$('#active').checked=p.active!==false;$('#featured').checked=!!p.featured;updatePreview()}
function newProduct(){selectedId=null;$('#productForm').reset();setForm({active:true,category:'Filamentos',image_url:'assets/img/product-filament.svg'});renderList()}
function editProduct(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;selectedId=p.id;setForm(p);renderList();window.scrollTo({top:0,behavior:'smooth'})}
function updatePreview(){const p=formPayload();$('#previewImage').src=adminImageSrc(p.image_url);$('#previewImage').onerror=()=>{$('#previewImage').src='../assets/img/product-filament.svg'};$('#previewTitle').textContent=p.title||'Preencha os dados do produto';$('#previewMeta').textContent=[p.store,p.category].filter(Boolean).join(' · ')||'Novo produto';$('#previewDesc').textContent=p.description||'A prévia aparece aqui.';$('#previewPrice').textContent=money(p.price)}
function renderStats(){const total=products.length,active=products.filter(p=>p.active).length,featured=products.filter(p=>p.featured).length,stores=new Set(products.map(p=>p.store).filter(Boolean)).size;$('#statTotal').textContent=total;$('#statActive').textContent=active;$('#statFeatured').textContent=featured;$('#statStores').textContent=stores}
function renderList(){const query=($('#adminSearch')?.value||'').trim().toLowerCase();let q=products.slice().sort((a,b)=>(Number(b.featured)-Number(a.featured))||(Number(a.sort_order||0)-Number(b.sort_order||0))||String(a.title).localeCompare(String(b.title)));if(query)q=q.filter(p=>[p.title,p.store,p.category,p.brand].join(' ').toLowerCase().includes(query));$('#productList').innerHTML=q.map(p=>`<div class="admin-product-item ${String(p.id)===String(selectedId)?'active':''}" data-id="${safe(p.id)}"><img src="${safe(adminImageSrc(p.image_url))}" onerror="this.src='../assets/img/product-filament.svg'"><div><strong>${safe(p.title||'Sem título')}</strong><small>${safe(p.store||'Sem loja')} · ${money(p.price)}</small></div><span class="status-dot ${p.active?'on':''}"></span></div>`).join('')||'<div class="admin-empty">Nenhum produto encontrado.</div>';document.querySelectorAll('.admin-product-item').forEach(x=>x.onclick=()=>editProduct(x.dataset.id));renderStats()}
async function isAdmin(){const {data,error}=await client().rpc('is_admin');if(error)throw error;return data===true}
async function loadProducts(){const {data,error}=await client().from('products').select('*').order('featured',{ascending:false}).order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(error)throw error;products=data||[];renderList();if(selectedId){const keep=products.find(p=>String(p.id)===String(selectedId));if(keep)setForm(keep);else newProduct()}else newProduct()}
function showLogin(message=''){document.body.classList.add('auth-locked');$('#loginScreen').hidden=false;$('#adminApp').hidden=true;$('#loginMessage').textContent=message;$('#loginEmail').focus()}
function showApp(){document.body.classList.remove('auth-locked');$('#loginScreen').hidden=true;$('#adminApp').hidden=false;$('#userEmail').textContent=currentUser?.email||'Administrador'}
async function bootstrap(){
  if(!configured()){
    $('#configMissing').hidden=false;showLogin('O site ainda não foi conectado ao Supabase. Abra assets/js/config.js e faça a configuração indicada no README.');$('#loginForm').querySelector('button').disabled=true;return;
  }
  try{
    const {data:{session}}=await client().auth.getSession();
    if(!session){showLogin();return}
    const {data:{user},error}=await client().auth.getUser();if(error||!user){await client().auth.signOut();showLogin();return}
    currentUser=user;
    if(!(await isAdmin())){await client().auth.signOut();showLogin('Este usuário existe, mas não possui permissão administrativa.');return}
    showApp();await loadProducts();
  }catch(e){console.error(e);showLogin('Não foi possível validar o acesso. Verifique a configuração do Supabase.')}
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!configured())return;const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;$('#loginMessage').textContent='Validando acesso…';try{setBusy(true);const {data,error}=await client().auth.signInWithPassword({email,password});if(error)throw error;currentUser=data.user;if(!(await isAdmin())){await client().auth.signOut();throw new Error('Usuário sem permissão administrativa.')}showApp();await loadProducts();toast('Acesso liberado.','ok')}catch(err){console.error(err);$('#loginMessage').textContent=err.message==='Invalid login credentials'?'E-mail ou senha inválidos.':err.message||'Falha no login.'}finally{setBusy(false)}});
$('#logoutBtn').onclick=async()=>{await client().auth.signOut();currentUser=null;products=[];showLogin('Sessão encerrada.')};
$('#productForm').addEventListener('submit',async e=>{e.preventDefault();const payload=formPayload();if(!payload.title)return toast('Informe o título do produto.','error');try{setBusy(true);if(selectedId){const {error}=await client().from('products').update(payload).eq('id',selectedId);if(error)throw error;toast('Produto atualizado.','ok')}else{const {data,error}=await client().from('products').insert(payload).select().single();if(error)throw error;selectedId=data.id;toast('Produto cadastrado.','ok')}await loadProducts()}catch(err){console.error(err);toast('Não foi possível salvar: '+(err.message||'erro'),'error')}finally{setBusy(false)}});
$('#deleteBtn').onclick=async()=>{if(!selectedId)return toast('Selecione um produto para excluir.');const p=products.find(x=>String(x.id)===String(selectedId));if(!confirm(`Excluir "${p?.title||'este produto'}"?`))return;try{setBusy(true);const {error}=await client().from('products').delete().eq('id',selectedId);if(error)throw error;selectedId=null;await loadProducts();toast('Produto excluído.','ok')}catch(err){toast('Falha ao excluir: '+err.message,'error')}finally{setBusy(false)}};
$('#newBtn').onclick=newProduct;
$('#adminSearch').addEventListener('input',renderList);
$('#productForm').addEventListener('input',updatePreview);
$('#productForm').addEventListener('change',updatePreview);
$('#fetchUrlBtn').onclick=async()=>{const url=$('#quickUrl').value.trim();if(!url)return toast('Cole a URL do produto.');try{new URL(url)}catch{return toast('URL inválida.','error')};try{setBusy(true);toast('Buscando dados do produto…');const endpoint=(window.PRINTLY_CONFIG?.META_IMPORTER_URL||'https://api.microlink.io').replace(/\/$/,'')+'?url='+encodeURIComponent(url);const r=await fetch(endpoint);const json=await r.json();if(!r.ok||json.status!=='success')throw new Error('A página não permitiu a leitura automática.');const d=json.data||{};$('#sourceUrl').value=url;if(d.title)$('#title').value=d.title;if(d.description)$('#description').value=d.description;if(d.image?.url)$('#image').value=d.image.url;if(!$('#store').value){try{$('#store').value=new URL(url).hostname.replace(/^www\./,'')}catch{}};if(d.price){const value=d.price?.value??d.price;$('#price').value=String(value).replace('.',',')}updatePreview();toast('Dados importados. Confira antes de salvar.','ok')}catch(err){console.error(err);$('#sourceUrl').value=url;toast('Não consegui puxar tudo automaticamente. A URL foi mantida para preenchimento manual.','error')}finally{setBusy(false)}};
['#title','#category','#subcategory','#brand','#store','#price','#oldPrice','#image','#description','#tags','#badge','#sourceUrl','#affiliateUrl','#sortOrder','#active','#featured'].forEach(id=>$(id)?.addEventListener('input',updatePreview));
bootstrap();
