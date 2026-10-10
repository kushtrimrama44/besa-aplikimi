'use strict';
const cfg=window.BESA_CONFIG;
const ready=!!(cfg?.url&&cfg?.anonKey);
const supa=ready?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const gate=document.querySelector('#loginGate'),appView=document.querySelector('#appView'),hrView=document.querySelector('#hrView');
const status=document.querySelector('#authStatus');
let currentRole=null;
function msg(t){status.textContent=t}
async function refresh(){
 gate.hidden=false;appView.hidden=true;hrView.hidden=true;
 if(!supa){msg('Konfiguro Supabase ne config.js per te aktivizuar kyçjen.');return;}
 const {data:{user}}=await supa.auth.getUser();if(!user){msg('');return;}
 const {data,error}=await supa.from('account_roles').select('role').eq('user_id',user.id).single();
 if(error||!['aplikant','hr'].includes(data?.role)){await supa.auth.signOut();msg('Llogaria nuk ka rol te autorizuar.');return;}
 currentRole=data.role;gate.hidden=true;
 if(currentRole==='aplikant'){appView.hidden=false;document.querySelector('#application').reset();document.querySelector('#application').dispatchEvent(new Event('change'));}
 else {hrView.hidden=false;await loadHR();}
}
document.querySelector('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!supa){msg('Se pari ploteso config.js');return;}
 const username=document.querySelector('#username').value.trim().toLowerCase();
 const password=document.querySelector('#password').value;
 const allowed=['aplikant1','aplikant2','aplikant3','admin'];
 if(!allowed.includes(username)){msg('Username i pavlefshem.');return;}
 const email=`${username}@besa.login`;
 const {error}=await supa.auth.signInWithPassword({email,password});
 if(error){msg('Kyçja deshtoi. Kontrollo kredencialet.');return;}await refresh();
});
document.querySelectorAll('.logout').forEach(b=>b.addEventListener('click',async()=>{await supa.auth.signOut();currentRole=null;await refresh()}));
const fileFields=['leternjoftimi_file','kartela_bankare_file','certifikata_trajnimi_file','certifikata_shkollore_file'];
async function submitApplication(form){
 if(!supa||currentRole!=='aplikant')throw new Error('Nuk jeni i autorizuar.');
 const fd=new FormData(form);const payload={};
 for(const [key,val] of fd.entries()){if(!(val instanceof File))payload[key]=val;}
 payload.kategorite=fd.getAll('kategorite');payload.data_aplikimit=new Date().toISOString();
 const applicationId=crypto.randomUUID();const uploaded=[];
 try{
  for(const name of fileFields){const file=fd.get(name);if(!file||!file.size)continue;
   const extension=file.name.split('.').pop().toLowerCase();
   const allowedTypes={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};
   if(!allowedTypes[extension]||file.type!==allowedTypes[extension]||file.size>5242880)throw new Error('Dokumenti duhet te jete PDF/JPG/PNG deri ne 5 MB: '+name);
   const path=`${applicationId}/${name}.${extension}`;
   const {error}=await supa.storage.from('application-documents').upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw new Error('Ngarkimi i dokumentit deshtoi: '+name);uploaded.push(path);payload[name]=path;
  }
  const {error}=await supa.from('applications').insert({id:applicationId,data:payload});
  if(error)throw new Error('Ruajtja e aplikimit deshtoi: '+error.message);
  form.reset();form.dispatchEvent(new Event('change'));return applicationId;
 }catch(err){for(const path of uploaded)await supa.storage.from('application-documents').remove([path]);throw err;}
}
window.besaSubmit=submitApplication;
async function loadHR(){
 const root=document.querySelector('#hrList');root.textContent='Duke ngarkuar...';
 const {data,error}=await supa.from('applications').select('id,created_at,data,status').order('created_at',{ascending:false}).limit(200);
 if(error){root.textContent='Gabim: '+error.message;return;}
 root.replaceChildren();if(!data.length){root.textContent='Nuk ka aplikime ende.';return;}
 for(const record of data){const d=record.data||{};const card=document.createElement('article');card.className='hr-card';
 const heading=document.createElement('h3');heading.textContent=[d.emri,d.mbiemri].filter(Boolean).join(' ')+' — '+(d.pozita||'');card.append(heading);
 const meta=document.createElement('p');meta.textContent=new Date(record.created_at).toLocaleString('sq-AL')+' · '+record.status;card.append(meta);
 const show=document.createElement('button');show.textContent='Shiko / Printo A4';show.onclick=()=>printApplication(record);card.append(show);
 const select=document.createElement('select');for(const v of ['I ri','Ne shqyrtim','Interviste','Pranuar','Refuzuar']){const o=document.createElement('option');o.value=v;o.textContent=v;select.append(o);}select.value=record.status;select.onchange=async()=>{const {error}=await supa.from('applications').update({status:select.value}).eq('id',record.id);if(error)alert(error.message);};card.append(select);
 for(const field of fileFields){if(!d[field])continue;const b=document.createElement('button');b.textContent='Hap '+field.replaceAll('_',' ');b.onclick=async()=>{const {data:link,error}=await supa.storage.from('application-documents').createSignedUrl(d[field],60);if(error)alert(error.message);else window.open(link.signedUrl,'_blank','noopener,noreferrer');};card.append(b);}
 root.append(card);
 }
}
document.querySelector('#refreshHR').addEventListener('click',loadHR);

// Emertimet ndryshojne vetem ne printim; celesat e databazes mbeten te pandryshuar.
const printLabels={
 emri:'Emri',mbiemri:'Mbiemri',peshа:'Pesha',pesha:'Pesha',adresa:'Adresa',
 denuar:'I denuar',gjinia:'Gjinia',pozita:'Pozita e aplikuar',
 patente:'Patenta e shoferit',drejtimi:'Drejtimi i shkollimit',
 gjatesia:'Gjatesia',telefoni:'Numri i telefonit',trajnime:'Trajnimet',
 kategorite:'Kategorite e patentes',vendbanimi:'Vendbanimi',
 emri_babait:'Emri i babait','emri babait':'Emri i babait',
 data_lindjes:'Data e lindjes','data lindjes':'Data e lindjes',
 vendi_lindjes:'Vendi i lindjes','vendi lindjes':'Vendi i lindjes',
 xhirollogaria:'Xhirollogaria bankare',data_aplikimit:'Data e aplikimit',
 lidhja_familjare:'Lidhja familjare',kontakti_familjar:'Kontakti familjar',
 nacionaliteti:'Nacionaliteti',etnia:'Perkatesia etnike',
 shkollimi:'Shkollimi',arsimi:'Arsimi',email:'Email',
 pershkrimi_denimit:'Pershkrimi i denimit',trajnimet_detaje:'Detajet e trajnimeve'
};
function printLabel(key){
 const normalized=key.trim().toLowerCase().replace(/\s+/g,'_');
 return printLabels[key]||printLabels[normalized]||normalized.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
}
function printApplication(record){
 const d=record.data||{};
 const win=window.open('','_blank');
 if(!win){alert('Lejo pop-up per printim.');return;}
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const excluded=new Set([...fileFields,'pajtimi']);
 const order=['emri','mbiemri','emri_babait','data_lindjes','vendi_lindjes','gjinia','vendbanimi','adresa','telefoni','pozita','shkollimi','drejtimi','trajnime','patente','kategorite','gjatesia','pesha','denuar','xhirollogaria','lidhja_familjare','kontakti_familjar','data_aplikimit'];
 const rank=k=>{const i=order.indexOf(k.toLowerCase().replace(/\s+/g,'_'));return i<0?999:i;};
 const rows=Object.entries(d).filter(([k])=>!excluded.has(k))
  .sort((a,b)=>rank(a[0])-rank(b[0]))
  .map(([k,v])=>`<tr><th scope="row">${esc(printLabel(k))}</th><td>${esc(Array.isArray(v)?v.join(', '):v)}</td></tr>`).join('');
 const created=new Date(record.created_at).toLocaleString('sq-AL');
 const style=`<style>
 @page{size:A4 portrait;margin:12mm}
 *{box-sizing:border-box}
 body{margin:0;color:#14283e;font:10pt Arial,Helvetica,sans-serif}
 .toolbar{display:flex;gap:8px;justify-content:flex-end;margin:12px auto;max-width:186mm}
 .toolbar button{background:#163b61;color:#fff;border:0;border-radius:5px;padding:9px 14px;cursor:pointer}
 .sheet{max-width:186mm;margin:0 auto}
 header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #173b63;padding-bottom:9px;margin-bottom:10px}
 header img{width:58px;height:58px;object-fit:contain}
 header strong{font-size:11pt;letter-spacing:.3px}
 h1{font-size:16pt;margin:4px 0 5px}
 .meta{font-size:8pt;color:#52667b;overflow-wrap:anywhere}
 table{width:100%;border-collapse:collapse;table-layout:fixed}
 tr{break-inside:avoid;page-break-inside:avoid}
 th,td{border:1px solid #d8e1eb;padding:4px 7px;vertical-align:top;line-height:1.2;overflow-wrap:anywhere;text-align:left}
 th{background:#edf2f7;width:35%;font-weight:700}
 footer{margin-top:12px;border-top:1px solid #d8e1eb;padding-top:6px;font-size:8pt;color:#52667b}
 @media print{.toolbar{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{max-width:none}}
 </style>`;
 win.document.write(`<!doctype html><html lang="sq"><head><meta charset="utf-8"><title>Aplikimi A4 - ${esc(record.id)}</title>${style}</head><body><div class="toolbar"><button onclick="window.print()">Printo / Ruaj PDF</button><button onclick="window.close()">Mbyll</button></div><main class="sheet"><header><img src="besa-logo.png" alt="Besa Security"><div><strong>BESA SECURITY</strong><h1>Formulari i aplikimit per pune</h1><div class="meta">Nr. aplikimit: ${esc(record.id)} | Statusi: ${esc(record.status)}</div></div></header><table>${rows}</table><footer>Data e regjistrimit: ${esc(created)}. Dokumentet shikohen vecmas ne HR Dashboard.</footer></main></body></html>`);
 win.document.close();
}
refresh();
