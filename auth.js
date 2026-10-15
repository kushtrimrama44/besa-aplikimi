
'use strict';

const cfg = window.BESA_CONFIG;
const ready = !!(cfg?.url && cfg?.anonKey);
const supa = ready
  ? window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

const gate = document.querySelector('#loginGate');
const appView = document.querySelector('#appView');
const hrView = document.querySelector('#hrView');
const status = document.querySelector('#authStatus');

let currentRole = null;

function msg(text) {
  status.textContent = text;
}

async function refresh() {
  gate.hidden = false;
  appView.hidden = true;
  hrView.hidden = true;
  currentRole = null;

  if (!supa) {
    msg('Konfiguro Supabase ne config.js.');
    return;
  }

  const { data: { user }, error: userError } = await supa.auth.getUser();
  if (userError || !user) {
    msg('');
    return;
  }

  const { data, error } = await supa
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !['aplikant', 'hr'].includes(data?.role)) {
    await supa.auth.signOut();
    msg('Llogaria nuk ka rol te autorizuar.');
    return;
  }

  currentRole = data.role;
  gate.hidden = true;

  if (currentRole === 'aplikant') {
    appView.hidden = false;
    const form = document.querySelector('#application');
    form.reset();
    form.dispatchEvent(new Event('change'));
  } else {
    hrView.hidden = false;
    await loadHR();
  }
}

// LOGIN

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();

  if (!supa) {
    msg('Se pari ploteso config.js.');
    return;
  }

  const username = document.querySelector('#username')
    .value.trim().toLowerCase();
  const password = document.querySelector('#password').value;

  const allowed = ['aplikant1', 'aplikant2', 'aplikant3', 'admin'];

  if (!allowed.includes(username)) {
    msg('Username i pavlefshem.');
    return;
  }

  const { error } = await supa.auth.signInWithPassword({
    email: `${username}@besa.login`,
    password
  });

  if (error) {
    msg('Kyçja deshtoi. Kontrollo kredencialet.');
    return;
  }

  await refresh();
});

document.querySelectorAll('.logout').forEach(button => {
  button.addEventListener('click', async () => {
    if (supa) await supa.auth.signOut();
    currentRole = null;
    await refresh();
  });
});

// DOKUMENTET

const fileFields = [
  'leternjoftimi_para_file',
  'leternjoftimi_prapa_file',
  'kartela_bankare_file',
  'certifikata_trajnimi_file',
  'certifikata_shkollore_file'
];

const requiredFiles = [
  'leternjoftimi_para_file',
  'leternjoftimi_prapa_file',
  'kartela_bankare_file'
];

const documentLabels = {
  leternjoftimi_para_file: 'Leternjoftimi - Pjesa e perparme',
  leternjoftimi_prapa_file: 'Leternjoftimi - Pjesa e pasme',
  leternjoftimi_file: 'Leternjoftimi (aplikim i vjeter)',
  kartela_bankare_file: 'Dokumenti bankar',
  certifikata_trajnimi_file: 'Certifikata e trajnimeve',
  certifikata_shkollore_file: 'Certifikata shkollore'
};

const allDocumentFields = [...fileFields, 'leternjoftimi_file'];

// DERGIMI I APLIKIMIT

async function submitApplication(form) {
  if (!supa || currentRole !== 'aplikant') {
    throw new Error('Nuk jeni i autorizuar.');
  }

  const fd = new FormData(form);
  const payload = {};

  for (const [key, value] of fd.entries()) {
    if (!(value instanceof File)) {
      payload[key] = value;
    }
  }

  payload.kategorite = fd.getAll('kategorite');
  payload.data_aplikimit = new Date().toISOString();

  const applicationId = crypto.randomUUID();
  const uploaded = [];

  try {
    for (const name of fileFields) {
      const file = fd.get(name);

      if (!file || !file.size) {
        if (requiredFiles.includes(name)) {
          throw new Error('Dokumenti i detyrueshem mungon: ' + documentLabels[name]);
        }
        continue;
      }

      const extension = file.name.split('.').pop().toLowerCase();

      const allowedTypes = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png'
      };

      if (
        !allowedTypes[extension] ||
        file.type !== allowedTypes[extension] ||
        file.size > 5242880
      ) {
        throw new Error(
          'Dokumenti duhet te jete PDF/JPG/PNG deri ne 5 MB: ' +
          documentLabels[name]
        );
      }

      const path = `${applicationId}/${name}.${extension}`;

      const { error } = await supa.storage
        .from('application-documents')
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        throw new Error(
          'Ngarkimi deshtoi per ' + documentLabels[name] +
          ': ' + error.message
        );
      }

      uploaded.push(path);
      payload[name] = path;
    }

    const { error } = await supa
      .from('applications')
      .insert({ id: applicationId, data: payload });

    if (error) {
      throw new Error('Ruajtja e aplikimit deshtoi: ' + error.message);
    }

    form.reset();
    form.dispatchEvent(new Event('change'));
    return applicationId;

  } catch (error) {
    if (uploaded.length) {
      await supa.storage
        .from('application-documents')
        .remove(uploaded);
    }
    throw error;
  }
}

window.besaSubmit = submitApplication;

// EMERTIMET E FUSHAVE

const fieldLabels = {
  pozita: 'Pozita e aplikuar',
  emri: 'Emri',
  emri_babait: 'Emri i babait',
  mbiemri: 'Mbiemri',
  numri_leternjoftimit: 'Numri i leternjoftimit',
  data_lindjes: 'Data e lindjes',
  vendi_lindjes: 'Vendi i lindjes',
  vendbanimi: 'Vendbanimi',
  adresa: 'Adresa',
  telefoni: 'Numri i telefonit',
  perkatesia_etnike: 'Perkatesia etnike',
  perkatesia_tjeter: 'Perkatesia etnike - Tjeter',
  gjinia: 'Gjinia',
  pesha: 'Pesha (kg)',
  gjatesia: 'Gjatesia (cm)',
  pergatitja_shkollore: 'Pergatitja shkollore',
  drejtimi: 'Drejtimi i shkollimit',
  trajnime: 'Trajnimet per sigurim',
  pershkrim_trajnimeve: 'Pershkrimi i trajnimeve',
  patente: 'Patenta e shoferit',
  kategorite: 'Kategorite e patentes',
  denuar: 'I denuar me heret',
  statusi_ligjor: 'Statusi ligjor',
  arsyeja_statusit: 'Arsyeja / Sqarimi',
  xhirollogaria: 'Xhirollogaria bankare',
  kontakti_familjar: 'Kontakti familjar',
  telefoni_familjar: 'Telefoni i kontaktit familjar',
  lidhja_familjare: 'Lidhja familjare',
  data_aplikimit: 'Data e aplikimit'
};

function formatFieldLabel(key) {
  const normalized = String(key)
    .trim().toLowerCase().replace(/\s+/g, '_');

  return fieldLabels[normalized] ||
    normalized.replaceAll('_', ' ')
      .replace(/^./, character => character.toUpperCase());
}

// HR DASHBOARD

async function loadHR() {
  const root = document.querySelector('#hrList');
  root.textContent = 'Duke ngarkuar...';

  const { data, error } = await supa
    .from('applications')
    .select('id,created_at,data,status')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    root.textContent = 'Gabim: ' + error.message;
    return;
  }

  root.replaceChildren();

  if (!data?.length) {
    root.textContent = 'Nuk ka aplikime ende.';
    return;
  }

  for (const record of data) {
    const d = record.data || {};
    const card = document.createElement('article');
    card.className = 'hr-card';

    const heading = document.createElement('h3');
    heading.textContent =
      [d.emri, d.mbiemri].filter(Boolean).join(' ') +
      ' — ' + (d.pozita || '');
    card.append(heading);

    const meta = document.createElement('p');
    meta.textContent =
      new Date(record.created_at).toLocaleString('sq-AL') +
      ' · ' + (record.status || 'I ri');
    card.append(meta);

    const show = document.createElement('button');
    show.type = 'button';
    show.textContent = 'Shiko / Printo A4';
    show.onclick = () => printApplication(record);
    card.append(show);

    const select = document.createElement('select');

    for (const value of [
      'I ri', 'Ne shqyrtim', 'Interviste', 'Pranuar', 'Refuzuar'
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    }

    select.value = record.status || 'I ri';

    select.onchange = async () => {
      const previous = record.status || 'I ri';
      const { error } = await supa
        .from('applications')
        .update({ status: select.value })
        .eq('id', record.id);

      if (error) {
        alert(error.message);
        select.value = previous;
      } else {
        record.status = select.value;
      }
    };

    card.append(select);

    // Buton i vecante per secilen ane te leternjoftimit
    for (const field of allDocumentFields) {
      if (!d[field]) continue;

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Hap ' + documentLabels[field];

      button.onclick = async () => {
        const { data: link, error } = await supa.storage
          .from('application-documents')
          .createSignedUrl(d[field], 60);

        if (error) {
          alert(error.message);
        } else {
          window.open(
            link.signedUrl,
            '_blank',
            'noopener,noreferrer'
          );
        }
      };

      card.append(button);
    }

    root.append(card);
  }
}

document.querySelector('#refreshHR')
  .addEventListener('click', loadHR);

// PRINTIMI A4

function printApplication(record) {
  const d = record.data || {};
  const win = window.open('', '_blank');

  if (!win) {
    alert('Lejo pop-up per printim.');
    return;
  }

  const esc = value => String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character])
  );

  const groups = [
    {
      number: '01',
      title: 'Pozita dhe te dhenat personale',
      keys: [
        'pozita', 'emri', 'emri_babait', 'mbiemri',
        'numri_leternjoftimit', 'data_lindjes',
        'vendi_lindjes', 'vendbanimi', 'adresa',
        'telefoni', 'perkatesia_etnike',
        'perkatesia_tjeter', 'gjinia', 'pesha', 'gjatesia'
      ]
    },
    {
      number: '02',
      title: 'Arsimi dhe kualifikimet',
      keys: [
        'pergatitja_shkollore', 'drejtimi',
        'trajnime', 'pershkrim_trajnimeve',
        'patente', 'kategorite', 'denuar',
        'statusi_ligjor', 'arsyeja_statusit'
      ]
    },
    {
      number: '03',
      title: 'Banka dhe kontakti familjar',
      keys: [
        'xhirollogaria', 'kontakti_familjar',
        'telefoni_familjar', 'lidhja_familjare'
      ]
    }
  ];

  const excluded = new Set([
    ...allDocumentFields, 'pajtimi', 'data_aplikimit'
  ]);

  const used = new Set(excluded);
  const valueText = value =>
    Array.isArray(value) ? value.join(', ') : String(value ?? '');

  function fieldHTML(key) {
    const value = valueText(d[key]);

    return `
      <div class="field">
        <span class="field-label">${esc(formatFieldLabel(key))}</span>
        <span class="field-value">${esc(value || '—')}</span>
      </div>
    `;
  }

  let sections = '';

  for (const group of groups) {
    group.keys.forEach(key => used.add(key));

    const visible = group.keys.filter(key =>
      d[key] !== undefined &&
      d[key] !== null &&
      valueText(d[key]).trim() !== ''
    );

    sections += `
      <section class="section">
        <h2>${group.number} · ${esc(group.title)}</h2>
        <div class="fields">
          ${visible.map(fieldHTML).join('')}
        </div>
      </section>
    `;
  }

  const extra = Object.keys(d).filter(key =>
    !used.has(key) &&
    d[key] !== null &&
    d[key] !== undefined &&
    valueText(d[key]).trim() !== ''
  );

  if (extra.length) {
    sections += `
      <section class="section">
        <h2>04 · Te dhena shtese</h2>
        <div class="fields">${extra.map(fieldHTML).join('')}</div>
      </section>
    `;
  }

  const docs = allDocumentFields
    .filter(key => key !== 'leternjoftimi_file' || d[key])
    .map(key => `
      <div>
        ${esc(documentLabels[key])}:
        <strong>${d[key] ? 'Bashkengjitur' : 'Nuk eshte bashkengjitur'}</strong>
      </div>
    `).join('');

  sections += `
    <section class="section">
      <h2>05 · Dokumentet e bashkengjitura</h2>
      <div class="docs">${docs}</div>
    </section>
  `;

  const date = new Date(record.created_at).toLocaleString('sq-AL');
  const logo = new URL('besa-logo.png', window.location.href).href;

  const css = `
    @page { size: A4 portrait; margin: 11mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 10px Arial, sans-serif;
      color: #172a40;
      background: #edf1f5;
    }
    .toolbar {
      padding: 12px;
      background: #152f4c;
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .toolbar button {
      padding: 10px 16px;
      border: 0;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    }
    .sheet {
      background: white;
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 11mm;
    }
    .heading {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid #b52733;
      padding-bottom: 10px;
    }
    .logo {
      width: 65px;
      max-height: 55px;
      object-fit: contain;
    }
    h1 {
      font-size: 17px;
      margin: 4px 0;
    }
    .meta {
      margin: 10px 0;
      padding: 8px;
      background: #f2f5f8;
      font-size: 9px;
      overflow-wrap: anywhere;
    }
    .section {
      margin-bottom: 9px;
    }
    .section h2 {
      font-size: 11px;
      padding: 6px;
      background: #eaf0f5;
      border-left: 3px solid #b52733;
      break-after: avoid;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 8px;
    }
    .field {
      display: grid;
      grid-template-columns: 43% 57%;
      border-bottom: 1px solid #dce4ec;
      padding: 5px 3px;
      break-inside: avoid;
    }
    .field-label {
      font-weight: bold;
      color: #4b5c6d;
      padding-right: 4px;
    }
    .field-value {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .docs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      padding: 6px;
    }
    footer {
      border-top: 1px solid #dce4ec;
      margin-top: 12px;
      padding-top: 8px;
      font-size: 9px;
    }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet {
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 0;
      }
      .section h2 {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;

  win.document.write(`
    <!doctype html>
    <html lang="sq">
    <head>
      <meta charset="utf-8">
      <title>Aplikimi A4 - Besa Security</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="toolbar">
        <button onclick="window.print()">Printo / Ruaj PDF</button>
        <button onclick="window.close()">Mbyll</button>
      </div>
      <main class="sheet">
        <header class="heading">
          <img class="logo" src="${esc(logo)}" alt="Besa Security">
          <div>
            <strong>BESA SECURITY</strong>
            <h1>FORMULARI I APLIKIMIT PER PUNE</h1>
            <small>Departamenti i Burimeve Njerezore</small>
          </div>
        </header>
        <div class="meta">
          <div>Nr. aplikimit: <strong>${esc(record.id)}</strong></div>
          <div>Data: <strong>${esc(date)}</strong></div>
          <div>Statusi: <strong>${esc(record.status || 'I ri')}</strong></div>
        </div>
        ${sections}
        <footer>
          BESA SECURITY · Your safety, our promise.
          <p>Dokumentet hapen vecmas ne Dashboard HR.</p>
        </footer>
      </main>
    </body>
    </html>
  `);

  win.document.close();
}

refresh();
