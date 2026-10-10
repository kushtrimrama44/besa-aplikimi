'use strict';

const cfg = window.BESA_CONFIG;
const ready = !!(cfg?.url && cfg?.anonKey);

const supa = ready
  ? window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
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

  if (!supa) {
    msg('Konfiguro Supabase ne config.js.');
    return;
  }

  const { data: { user }, error: userError } =
    await supa.auth.getUser();

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

// =============================================
// LOGIN ME USERNAME
// =============================================

document.querySelector('#loginForm')
  .addEventListener('submit', async event => {
    event.preventDefault();

    if (!supa) {
      msg('Se pari ploteso config.js.');
      return;
    }

    const username = document.querySelector('#username')
      .value.trim().toLowerCase();

    const password = document.querySelector('#password').value;

    const allowed = [
      'aplikant1',
      'aplikant2',
      'aplikant3',
      'admin'
    ];

    if (!allowed.includes(username)) {
      msg('Username i pavlefshem.');
      return;
    }

    const email = `${username}@besa.login`;

    const { error } = await supa.auth.signInWithPassword({
      email,
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
    await supa.auth.signOut();
    currentRole = null;
    await refresh();
  });
});

// =============================================
// DOKUMENTET
// =============================================

const fileFields = [
  'leternjoftimi_file',
  'kartela_bankare_file',
  'certifikata_trajnimi_file',
  'certifikata_shkollore_file'
];

// =============================================
// DERGIMI I APLIKIMIT
// =============================================

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

  for (const name of fileFields) {
    const file = fd.get(name);

    if (!file || !file.size) continue;

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
        'Dokumenti duhet te jete PDF/JPG/PNG deri ne 5 MB: ' + name
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
        'Ngarkimi i dokumentit deshtoi: ' + name
      );
    }

    payload[name] = path;
  }

  const { error } = await supa
    .from('applications')
    .insert({
      id: applicationId,
      data: payload
    });

  if (error) {
    throw new Error(
      'Ruajtja e aplikimit deshtoi: ' + error.message
    );
  }

  form.reset();
  form.dispatchEvent(new Event('change'));

  return applicationId;
}

window.besaSubmit = submitApplication;

// =============================================
// EMERTIMET PROFESIONALE TE FUSHAVE
// =============================================

const fieldLabels = {
  emri: 'Emri',
  mbiemri: 'Mbiemri',
  emri_babait: 'Emri i babait',
  pesha: 'Pesha',
  gjatesia: 'Gjatesia',
  gjinia: 'Gjinia',
  adresa: 'Adresa',
  vendbanimi: 'Vendbanimi',
  vendi_lindjes: 'Vendi i lindjes',
  data_lindjes: 'Data e lindjes',
  telefoni: 'Numri i telefonit',
  pozita: 'Pozita e aplikuar',
  drejtimi: 'Drejtimi i shkollimit',
  trajnime: 'Trajnimet profesionale',
  patente: 'Patenta e shoferit',
  kategorite: 'Kategorite e patentes',
  denuar: 'I denuar',
  xhirollogaria: 'Xhirollogaria bankare',
  data_aplikimit: 'Data e aplikimit',
  lidhja_familjare: 'Lidhja familjare',
  kontakti_familjar: 'Kontakti familjar'
};

function formatFieldLabel(key) {
  const normalized = String(key)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return fieldLabels[normalized] ||
    normalized
      .replaceAll('_', ' ')
      .replace(/^./, character => character.toUpperCase());
}

// =============================================
// HR DASHBOARD
// =============================================

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

  if (!data.length) {
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
      ' · ' + record.status;

    card.append(meta);

    const show = document.createElement('button');
    show.textContent = 'Shiko / Printo A4';
    show.onclick = () => printApplication(record);
    card.append(show);

    const select = document.createElement('select');

    for (const value of [
      'I ri',
      'Ne shqyrtim',
      'Interviste',
      'Pranuar',
      'Refuzuar'
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    }

    select.value = record.status;

    select.onchange = async () => {
      const { error } = await supa
        .from('applications')
        .update({ status: select.value })
        .eq('id', record.id);

      if (error) {
        alert(error.message);
      }
    };

    card.append(select);

    for (const field of fileFields) {
      if (!d[field]) continue;

      const button = document.createElement('button');
      button.textContent =
        'Hap ' + formatFieldLabel(field.replace('_file', ''));

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

// =============================================
// PRINTIMI PROFESIONAL A4
// =============================================

function printApplication(record) {
  const d = record.data || {};

  const win = window.open('', '_blank');

  if (!win) {
    alert('Lejo pop-up per printim.');
    return;
  }

  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character])
    );

  const excluded = new Set([
    ...fileFields,
    'pajtimi'
  ]);

  const preferredOrder = [
    'emri',
    'mbiemri',
    'emri_babait',
    'gjinia',
    'data_lindjes',
    'vendi_lindjes',
    'vendbanimi',
    'adresa',
    'telefoni',
    'pozita',
    'drejtimi',
    'trajnime',
    'patente',
    'kategorite',
    'denuar',
    'gjatesia',
    'pesha',
    'xhirollogaria',
    'lidhja_familjare',
    'kontakti_familjar',
    'data_aplikimit'
  ];

  const entries = Object.entries(d)
    .filter(([key]) => !excluded.has(key));

  entries.sort(([a], [b]) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);

    return (
      (indexA === -1 ? 999 : indexA) -
      (indexB === -1 ? 999 : indexB)
    );
  });

  const rows = entries.map(([key, value]) => {
    const label = formatFieldLabel(key);

    let displayValue = Array.isArray(value)
      ? value.join(', ')
      : value;

    if (key === 'data_aplikimit' && displayValue) {
      const date = new Date(displayValue);
      if (!Number.isNaN(date.getTime())) {
        displayValue = date.toLocaleString('sq-AL');
      }
    }

    return `
      <tr>
        <td class="field-label">${esc(label)}</td>
        <td>${esc(displayValue)}</td>
      </tr>
    `;
  }).join('');

  const created = new Date(record.created_at)
    .toLocaleString('sq-AL');

  const style = `
    <style>
      @page {
        size: A4 portrait;
        margin: 11mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
        font-size: 9pt;
        color: #172b42;
        margin: 0;
        background: white;
      }

      .toolbar {
        display: flex;
        gap: 10px;
        padding: 12px;
        background: #edf2f7;
        margin-bottom: 15px;
      }

      .toolbar button {
        padding: 9px 16px;
        border: 0;
        border-radius: 5px;
        background: #173b63;
        color: white;
        cursor: pointer;
      }

      .page {
        width: 100%;
        max-width: 188mm;
        margin: auto;
      }

      header {
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 2px solid #173b63;
        padding-bottom: 9px;
        margin-bottom: 10px;
      }

      header img {
        width: 72px;
        max-height: 55px;
        object-fit: contain;
      }

      h1 {
        font-size: 15pt;
        margin: 5px 0;
      }

      .company {
        font-weight: bold;
        font-size: 11pt;
      }

      .application-number {
        font-size: 8pt;
        overflow-wrap: anywhere;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      td {
        border: 1px solid #d8e0e8;
        padding: 4px 6px;
        vertical-align: top;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      .field-label {
        width: 37%;
        background: #edf2f7;
        font-weight: bold;
      }

      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      footer {
        margin-top: 12px;
        padding-top: 7px;
        border-top: 1px solid #d8e0e8;
        font-size: 8pt;
        color: #667788;
      }

      @media print {
        .toolbar {
          display: none !important;
        }

        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .page {
          max-width: none;
        }
      }
    </style>
  `;

  win.document.write(`
    <!doctype html>
    <html lang="sq">
    <head>
      <meta charset="utf-8">
      <title>Aplikimi per pune - Besa Security</title>
      ${style}
    </head>
    <body>
      <div class="toolbar">
        <button onclick="window.print()">
          Printo / Ruaj PDF
        </button>
        <button onclick="window.close()">
          Mbyll
        </button>
      </div>

      <main class="page">
        <header>
          <img src="${esc(new URL('besa-logo.png', window.location.href).href)}"
               alt="Besa Security">
          <div>
            <div class="company">BESA SECURITY</div>
            <h1>Formulari i aplikimit per pune</h1>
            <div class="application-number">
              Nr. aplikimit: ${esc(record.id)}
            </div>
          </div>
        </header>

        <table>
          <tbody>${rows}</tbody>
        </table>

        <footer>
          Data e regjistrimit: ${esc(created)}
          <br>
          Dokumentet e bashkengjitura shikohen vecmas
          ne Dashboard HR.
        </footer>
      </main>
    </body>
    </html>
  `);

  win.document.close();
}

// =============================================
// START
// =============================================

refresh();
