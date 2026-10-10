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
 // Path i vecante, i paparashikueshem per cdo aplikim.
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
function printApplication(record){
 const d=record.data||{};
 const win=window.open('','_blank');
 if(!win){alert('Lejo pop-up per shfaqjen e aplikimit A4.');return;}
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const groups=[
  ['01','Pozita dhe te dhenat personale',[
   ['pozita','Pozita e aplikuar'],['emri','Emri'],['emri_babait','Emri i babait'],['mbiemri','Mbiemri'],
   ['numri_leternjoftimit','Nr. i leternjoftimit'],['data_lindjes','Data e lindjes'],['vendi_lindjes','Vendi i lindjes'],
   ['vendbanimi','Vendbanimi'],['adresa','Adresa'],['telefoni','Telefoni'],['perkatesia_etnike','Perkatesia etnike'],
   ['perkatesia_tjeter','Perkatesia - tjeter'],['gjinia','Gjinia'],['pesha','Pesha (kg)'],['gjatesia','Gjatesia (cm)']]],
  ['02','Arsimi dhe kualifikimet',[
   ['pergatitja_shkollore','Pergatitja shkollore'],['drejtimi','Drejtimi'],['trajnime','Trajnime sigurimi'],
   ['pershkrim_trajnimeve','Pershkrimi i trajnimeve'],['patente','Patente shoferi'],['kategorite','Kategorite e patentes'],
   ['denuar','I denuar me heret'],['statusi_ligjor','Statusi ligjor'],['arsyeja_statusit','Arsyeja / sqarimi']]],
  ['03','Banka dhe kontakti familjar',[
   ['xhirollogaria','Numri i xhirollogarise'],['kontakti_familjar','Kontakti familjar'],
   ['telefoni_familjar','Telefoni familjar'],['lidhja_familjare','Lidhja familjare']]]
 ];
 const handled=new Set(['pajtimi','data_aplikimit','leternjoftimi_file','kartela_bankare_file','certifikata_trajnimi_file','certifikata_shkollore_file']);
 for(const [, , fields] of groups)for(const [key] of fields)handled.add(key);
 const val=v=>Array.isArray(v)?v.join(', '):String(v??'');
 const cell=(key,label)=>`<div class="field"><span class="field-label">${esc(label)}</span><span class="field-value">${esc(val(d[key])||'—')}</span></div>`;
 let sections=groups.map(([number,title,fields])=>{
  const visible=fields.filter(([k])=>d[k]!==undefined&&d[k]!==null&&val(d[k]).trim()!=='');
  return `<section class="section"><h2><span>${number}</span> ${esc(title)}</h2><div class="fields">${visible.map(([k,label])=>cell(k,label)).join('')}</div></section>`;
 }).join('');
 const extra=Object.entries(d).filter(([k,v])=>!handled.has(k)&&v!==null&&v!==undefined&&val(v).trim()!=='');
 if(extra.length)sections+=`<section class="section"><h2><span>04</span> Te dhena shtese</h2><div class="fields">${extra.map(([k])=>cell(k,k.replaceAll('_',' '))).join('')}</div></section>`;
 const docs=[['leternjoftimi_file','Leternjoftimi'],['kartela_bankare_file','Dokumenti bankar'],['certifikata_trajnimi_file','Certifikate trajnimi'],['certifikata_shkollore_file','Certifikate shkollore']];
 sections+=`<section class="section"><h2><span>05</span> Dokumentet e bashkengjitura</h2><div class="docs">${docs.map(([key,label])=>`<div>${esc(label)}: <strong>${d[key]?'Bashkengjitur':'Nuk eshte bashkengjitur'}</strong></div>`).join('')}</div></section>`;
 const date=new Date(record.created_at).toLocaleString('sq-AL');
 const css=`
 @page{size:A4 portrait;margin:10mm 11mm}
 *{box-sizing:border-box}
 html{background:#e8edf2}body{margin:0;font:10px Arial,Helvetica,sans-serif;color:#172a40}
 .toolbar{position:sticky;top:0;z-index:5;background:#152f4c;color:white;padding:12px 18px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:13px}
 .toolbar button{border:0;border-radius:6px;padding:9px 16px;background:#fff;color:#12304c;font-weight:bold;cursor:pointer}
 .toolbar .primary{background:#e33339;color:#fff}
 .sheet{background:#fff;width:210mm;min-height:297mm;margin:20px auto;padding:10mm 11mm;box-shadow:0 8px 35px #152f4c33}
 .heading{display:flex;gap:12px;align-items:center;border-bottom:2px solid #bf202c;padding-bottom:9px;margin-bottom:8px}
 .logo{width:64px;height:52px;object-fit:contain}
 .heading h1{font-size:17px;line-height:1.2;margin:2px 0 3px;color:#132c49}
 .heading .company{font-weight:800;letter-spacing:1px;font-size:11px}
 .heading .subtitle{font-size:9px;color:#637286}
 .meta{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;background:#f3f6f9;padding:7px 9px;border-radius:3px;font-size:9px;margin-bottom:9px}
 .meta strong{overflow-wrap:anywhere}
 .section{margin:0 0 8px;break-inside:auto}
 .section h2{font-size:10.5px;color:#153553;margin:0 0 4px;padding:5px 7px;background:#eaf0f5;border-left:3px solid #c92935;break-after:avoid;page-break-after:avoid}
 .section h2 span{color:#b52733;margin-right:5px}
 .fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 8px}
 .field{display:grid;grid-template-columns:43% 57%;border-bottom:1px solid #dce4ec;padding:4px 3px;min-height:23px;break-inside:avoid;page-break-inside:avoid}
 .field-label{color:#5c6d7d;font-size:9px;padding-right:4px}
 .field-value{font-size:9.5px;font-weight:600;overflow-wrap:anywhere;white-space:pre-wrap}
 .docs{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;padding:5px 3px;font-size:9px}
 .docs>div{break-inside:avoid}
 .foot{border-top:1px solid #d7e0e9;padding-top:6px;margin-top:10px;display:flex;justify-content:space-between;gap:8px;font-size:8px;color:#617285;break-inside:avoid}
 @media print{
  html,body{background:#fff;margin:0;padding:0}
  .toolbar{display:none!important}
  .sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
  .section{margin-bottom:6px}
  .field{padding:3px 3px;min-height:20px}
  .heading{padding-bottom:6px;margin-bottom:6px}
  .meta{margin-bottom:6px}
  .foot{margin-top:7px}
 }
 `;
 const html=`<!doctype html><html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aplikimi ${esc(record.id)} - A4</title><style>${css}</style></head><body><div class="toolbar"><span>Shikimi i aplikimit - A4</span><button class="primary" onclick="window.print()">Printo / Ruaj PDF</button><button onclick="window.close()">Mbyll</button></div><main class="sheet"><header class="heading"><img class="logo" src="${esc(new URL('besa-logo.png',location.href).href)}" alt="Besa Security"><div><div class="company">BESA SECURITY</div><h1>FORMULARI I APLIKIMIT PER PUNE</h1><div class="subtitle">Dokument per shqyrtim nga Departamenti i Burimeve Njerezore</div></div></header><div class="meta"><div>Nr. aplikimit: <strong>${esc(record.id)}</strong></div><div>Data: <strong>${esc(date)}</strong></div><div>Statusi: <strong>${esc(record.status)}</strong></div></div>${sections}<footer class="foot"><span>BESA SECURITY · Your safety, our promise.</span><span>Dokumentet hapen vecmas ne HR Dashboard.</span></footer></main></body></html>`;
 win.document.open();win.document.write(html);win.document.close();
}

refresh();
