'use strict';
const form=document.querySelector('#application');
const $=id=>document.getElementById(id);
const localDate=()=>new Intl.DateTimeFormat('sq-AL',{timeZone:'Europe/Belgrade',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
$('today').textContent=localDate();
function update(){
 document.querySelectorAll('[data-show]').forEach(el=>{const [id,want]=el.dataset.show.split(':');const val=$(id).value;const parentCondition=id==='statusi'&&form.elements.denuar.value!=='Po';const visible=!parentCondition&&!!val&&(want.startsWith('!')?val!==want.slice(1):val===want);toggle(el,visible)});
 document.querySelectorAll('[data-radio]').forEach(el=>{const [name,want]=el.dataset.radio.split(':');toggle(el,form.elements[name].value===want)});
}
function toggle(el,visible){el.classList.toggle('hidden',!visible);el.querySelectorAll('input,select,textarea').forEach(input=>{input.disabled=!visible;if(!visible){if(input.type==='checkbox'||input.type==='radio')input.checked=false;else input.value='';}if(input.type!=='checkbox'&&input.type!=='radio')input.required=visible&&el.querySelector('b')!==null;});}
form.addEventListener('change',update);update();
form.addEventListener('submit',async e=>{e.preventDefault();$('message').textContent='';if(!form.reportValidity())return;
 const categories=[...form.querySelectorAll('input[name="kategorite"]:checked')];if(form.elements.patente.value==='Po'&&!categories.length){$('message').textContent='Zgjidhni te pakten nje kategori te patentes.';return;}
 if(!validBirthDate(birthDate.value)){birthDate.setCustomValidity('Shkruani nje date te vlefshme DD.MM.VVVV');birthDate.reportValidity();return;}
 const allowed=['application/pdf','image/jpeg','image/png'];for(const input of form.querySelectorAll('input[type=file]'))for(const file of input.files){if(!allowed.includes(file.type)||file.size>5*1024*1024){$('message').textContent='Dokumenti '+file.name+' duhet te jete PDF/JPG/PNG dhe jo mbi 5 MB.';return;}}
 const button=form.querySelector('button[type="submit"]');button.disabled=true;$('message').textContent='Duke derguar aplikimin...';
 try{const id=await window.besaSubmit(form);$('message').textContent='Aplikimi u dergua me sukses! Referenca: '+id;}
 catch(err){$('message').textContent='Aplikimi nuk u dergua: '+err.message;}finally{button.disabled=false;}
});

// Data e lindjes: tastiere numerike dhe formatim automatik DD.MM.VVVV.
const birthDate=$('data_lindjes');
birthDate.addEventListener('input',()=>{
 const digits=birthDate.value.replace(/\D/g,'').slice(0,8);
 birthDate.value=[digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('.');
 birthDate.setCustomValidity('');
});
function validBirthDate(value){
 const match=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
 if(!match)return false;
 const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
 const date=new Date(Date.UTC(year,month-1,day));
 const now=new Date();
 return year>=1900&&date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day&&date.getTime()<=now.getTime();
}
birthDate.addEventListener('blur',()=>{
 birthDate.setCustomValidity(!birthDate.value||validBirthDate(birthDate.value)?'':'Shkruani nje date te vlefshme ne formatin DD.MM.VVVV.');
});
form.addEventListener('submit',()=>{
 birthDate.setCustomValidity(validBirthDate(birthDate.value)?'':'Shkruani nje date te vlefshme ne formatin DD.MM.VVVV.');
 if(!birthDate.validity.valid){birthDate.reportValidity();}
},true);
