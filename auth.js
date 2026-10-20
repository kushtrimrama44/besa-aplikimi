
'use strict';

// BESA SECURITY - Aplikim per Pune v1.3
// Perdor konfigurimin ekzistues config.js.

const cfg = window.BESA_CONFIG;

const supa = cfg?.url && cfg?.anonKey && window.supabase
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

// ============================================
// DOKUMENTET
// ============================================

const fileFields = [
  'leternjoftimi_para_file',
  'leternjoftimi_prapa_file',
  'kartela_bankare_file',
  'certifikata_trajnimi_file',
  'certifikata_shkollore_file'
];

const requiredFiles = fileFields.slice(0, 3);

const documentLabels = {
  leternjoftimi_para_file: 'Leternjoftimi - pjesa e perparme',
  leternjoftimi_prapa_file: 'Leternjoftimi - pjesa e pasme',
  leternjoftimi_file: 'Leternjoftimi (aplikim i vjeter)',
  kartela_bankare_file: 'Vertetimi bankar',
  certifikata_trajnimi_file: 'Certifikata e trajnimeve',
  certifikata_shkollore_file: 'Certifikata shkollore'
};

const allDocumentFields = [
  ...fileFields,
  'leternjoftimi_file'
];

// ============================================
// EMERTIMET E FUSHAVE
// ============================================

const labels = {
  pozita: 'Pozita e aplikuar',
  emri: 'Emer',
  mbiemri: 'Mbiemer',
  emri_babait: 'Emri i babait',
  gjinia: 'Gjinia',
  data_lindjes: 'Data e lindjes',
  vendi_lindjes: 'Vendi i lindjes',
  numri_leternjoftimit: 'Nr. i leternjoftimit',
  xhirollogaria: 'Xhirollogaria bankare',
  emri_bankes: 'Emri i bankes',
  emri_bankes_tjeter: 'Emri i bankes - Tjeter',
  adresa: 'Adresa',
  vendbanimi: 'Vendbanimi',
  telefoni: 'Nr. i telefonit',
  drejtimi: 'Drejtimi i shkollimit',
  trajnime: 'Trajnimet profesionale',
  pershkrim_trajnimeve: 'Pershkrimi i trajnimeve',
  kategorite: 'Kategorite e patentes',
  denuar: 'I denuar',
  gjatesia: 'Gjatesia (cm)',
  pesha: 'Pesha (kg)',
  perkatesia_etnike: 'Perkatesia etnike',
  perkatesia_tjeter: 'Perkatesia etnike - Tjeter',
  pergatitja_shkollore: 'Pergatitja shkollore',
  kontakti_familjar: 'Kontakti familjar',
  lidhja_familjare: 'Lidhja familjare',
  telefoni_familjar: 'Telefoni familjar',
  patente: 'Patenta e shoferit',
  statusi_ligjor: 'Statusi ligjor',
  arsyeja_statusit: 'Arsyeja / sqarimi'
};

const bankNames = {
  RBKO: 'Raiffeisen Bank Kosovo',
  TEB: 'TEB',
  NLB: 'NLB Banka',
  PCB: 'ProCredit Bank',
  BKT: 'Banka Kombetare Tregtare - BKT Kosove',
  BPB: 'Banka per Biznes - BPB',
  BE: 'Banka Ekonomike',
  ZIRAAT: 'Ziraat Bank Kosova',
  CREDINS: 'Banka Credins Kosove',
  PRIBANK: 'PriBank'
};

// Renditja e sakte e 24 fushave ne raportin A4.
const ordered = [
  'emri',
  'mbiemri',
  'emri_babait',
  'gjinia',
  'data_lindjes',
  'vendi_lindjes',
  'numri_leternjoftimit',
  'xhirollogaria',
  'emri_bankes',
  'adresa',
  'vendbanimi',
  'telefoni',
  'drejtimi',
  'trajnime',
  'pershkrim_trajnimeve',
  'kategorite',
  'denuar',
  'gjatesia',
  'pesha',
  'perkatesia_etnike',
  'pergatitja_shkollore',
  'kontakti_familjar',
  'lidhja_familjare',
  'telefoni_familjar'
];

// ============================================
// FUNKSIONET NDIHMESE
// ============================================

const formatNumber = number =>
  number == null
    ? 'Pa numer'
    : String(number).padStart(4, '0');

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

function displayValue(key, data) {
  let value = data[key];

  if (key === 'emri_bankes') {
    if (value === 'Tjeter' || value === 'Tjetër') {
      value = data.emri_bankes_tjeter || 'Tjeter';
    } else if (bankNames[value]) {
      value = bankNames[value] + ' (' + value + ')';
    }
  }

  if (Array.isArray(value)) {
    return value.join(', ') || '—';
  }

  return String(value ?? '').trim() || '—';
}

// ============================================
// AUTENTIKIMI
// ============================================

async function refresh() {
  gate.hidden = false;
  appView.hidden = true;
  hrView.hidden = true;
  currentRole = null;

  if (!supa) {
    status.textContent = 'Kontrollo config.js.';
    return;
  }

  const {
    data: { user },
    error
  } = await supa.auth.getUser();

  if (error || !user) {
    status.textContent = '';
    return;
  }

  const roleResult = await supa
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (
    roleResult.error ||
    !['aplikant', 'hr'].includes(roleResult.data?.role)
  ) {
    await supa.auth.signOut();
    status.textContent = 'Nuk keni rol te autorizuar.';
    return;
  }

  currentRole = roleResult.data.role;
  gate.hidden = true;

  if (currentRole === 'hr') {
    hrView.hidden = false;
    await loadHR();
  } else {
    appView.hidden = false;

    const form = document.querySelector('#application');
    form.reset();
    form.dispatchEvent(new Event('change'));
  }
}

// ============================================
// LOGIN
// ============================================

document.querySelector('#loginForm')
  .addEventListener('submit', async event => {
    event.preventDefault();

    if (!supa) {
      status.textContent = 'Supabase nuk eshte konfiguruar.';
      return;
    }

    const username = document.querySelector('#username')
      .value.trim().toLowerCase();

    if (
      !['aplikant1', 'aplikant2', 'aplikant3', 'admin']
        .includes(username)
    ) {
      status.textContent = 'Username i pavlefshem.';
      return;
    }

    const { error } = await supa.auth.signInWithPassword({
      email: username + '@besa.login',
      password: document.querySelector('#password').value
    });

    if (error) {
      status.textContent =
        'Kyçja deshtoi. Kontrollo kredencialet.';
      return;
    }

    await refresh();
  });

// ============================================
// LOGOUT
// ============================================

document.querySelectorAll('.logout').forEach(button => {
  button.addEventListener('click', async () => {
    if (supa) await supa.auth.signOut();
    await refresh();
  });
});

// ============================================
// DERGIMI I APLIKIMIT
// ============================================

async function submitApplication(form) {
  if (currentRole !== 'aplikant' || !supa) {
    throw new Error('Nuk jeni i autorizuar.');
  }

  const fd = new FormData(form);
  const data = {};

  for (const [key, value] of fd.entries()) {
    if (!(value instanceof File)) {
      data[key] = value;
    }
  }

  data.kategorite = fd.getAll('kategorite');
  data.data_aplikimit = new Date().toISOString();

  const id = crypto.randomUUID();
  const uploaded = [];

  try {
    for (const name of fileFields) {
      const file = fd.get(name);

      if (!file?.size) {
        if (requiredFiles.includes(name)) {
          throw new Error(
            'Dokumenti i detyrueshem mungon: ' +
            documentLabels[name]
          );
        }
        continue;
      }

      const ext = file.name.split('.').pop().toLowerCase();

      const allowed = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png'
      };

      if (
        !allowed[ext] ||
        allowed[ext] !== file.type ||
        file.size > 5242880
      ) {
        throw new Error(
          'Dokument i pavlefshem: ' + documentLabels[name]
        );
      }

      const path = id + '/' + name + '.' + ext;

      const { error } = await supa.storage
        .from('application-documents')
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        throw new Error(
          'Ngarkimi deshtoi: ' + error.message
        );
      }

      uploaded.push(path);
      data[name] = path;
    }

    // Supabase e gjeneron numrin rendor automatikisht.
    const {
      data: inserted,
      error
    } = await supa
      .from('applications')
      .insert({ id, data })
      .select('application_number')
      .single();

    if (error) {
      throw new Error(
        'Ruajtja deshtoi: ' + error.message
      );
    }

    form.reset();
    form.dispatchEvent(new Event('change'));

    return {
      id,
      number: inserted?.application_number ?? null
    };

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

// ============================================
// HR DASHBOARD
// ============================================

async function loadHR() {
  const root = document.querySelector('#hrList');
  root.textContent = 'Duke ngarkuar...';

  if (!supa) return;

  const { data, error } = await supa
    .from('applications')
    .select(
      'id,application_number,created_at,data,status'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    root.textContent = 'Gabim: ' + error.message;
    return;
  }

  root.replaceChildren();

  if (!data?.length) {
    root.textContent = 'Nuk ka aplikime.';
    return;
  }

  for (const record of data) {
    const d = record.data || {};
    const card = document.createElement('article');
    card.className = 'hr-card';

    const heading = document.createElement('h3');

    heading.textContent =
      'Nr. ' + formatNumber(record.application_number) +
      ' · ' +
      [d.emri, d.mbiemri].filter(Boolean).join(' ') +
      ' — ' + (d.pozita || '');

    card.append(heading);

    const meta = document.createElement('p');

    meta.textContent =
      new Date(record.created_at).toLocaleString('sq-AL') +
      ' · ' + (record.status || 'I ri');

    card.append(meta);

    const print = document.createElement('button');
    print.type = 'button';
    print.textContent = 'Shiko / Printo A4';
    print.onclick = () => printApplication(record);
    card.append(print);

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

    // Dokumentet e bashkengjitura
    for (const key of allDocumentFields) {
      if (!d[key]) continue;

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Hap ' + documentLabels[key];

      button.onclick = async () => {
        const { data: link, error } = await supa.storage
          .from('application-documents')
          .createSignedUrl(d[key], 60);

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

// ============================================
// RAPORTI A4 - NJE KOLONE
// ============================================

function printApplication(record) {
  const d = record.data || {};
  const win = window.open('', '_blank');

  if (!win) {
    alert('Lejo pop-up per printim.');
    return;
  }

  const logo = new URL(
    'besa-logo.png',
    window.location.href
  ).href;

  const date = new Date(record.created_at)
    .toLocaleString('sq-AL');

  // 24 fushat ne renditjen e kerkuar.
  const rows = ordered.map((key, index) => `
    <div class="field">
      <span class="label">
        ${index + 1}. ${esc(labels[key])}
      </span>
      <span class="value">
        ${esc(displayValue(key, d))}
      </span>
    </div>
  `).join('');

  const used = new Set([
    ...ordered,
    ...allDocumentFields,
    'data_aplikimit',
    'pajtimi',
    'emri_bankes_tjeter'
  ]);

  const extra = Object.keys(d)
    .filter(key =>
      !used.has(key) &&
      d[key] != null &&
      String(d[key]).trim()
    )
    .map(key => `
      <div class="field">
        <span class="label">
          ${esc(labels[key] || key.replaceAll('_', ' '))}
        </span>
        <span class="value">
          ${esc(displayValue(key, d))}
        </span>
      </div>
    `).join('');

  const docs = allDocumentFields
    .filter(key => d[key])
    .map(key => `
      <div>
        ${esc(documentLabels[key])}:
        <b>Bashkengjitur</b>
      </div>
    `).join('');

  // Logo 78px = 20% me e madhe se 65px.
  const css = `
    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #eef1f4;
      color: #182c42;
      font: 10px Arial, sans-serif;
    }

    .toolbar {
      padding: 12px;
      text-align: center;
      background: #163453;
    }

    .toolbar button {
      padding: 9px 16px;
      margin: 0 5px;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }

    .sheet {
      width: 210mm;
      min-height: 297mm;
      background: white;
      margin: 14px auto;
      padding: 10mm;
    }

    .heading {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
      border-bottom: 2px solid #b52733;
      padding-bottom: 9px;
    }

    .brand {
      display: flex;
      gap: 12px;
      align-items: center;
      min-width: 0;
    }

    .logo {
      width: 78px;
      max-height: 66px;
      object-fit: contain;
    }

    .heading h1 {
      font-size: 15px;
      margin: 3px 0;
    }

    .iso {
      text-align: right;
      white-space: nowrap;
      font-size: 9px;
      font-weight: bold;
    }

    .iso small {
      font-weight: normal;
    }

    .meta {
      padding: 7px 8px;
      margin: 9px 0;
      background: #f0f4f8;
    }

    .meta > div {
      margin: 3px 0;
    }

    .section-title {
      font-size: 11px;
      background: #edf2f6;
      border-left: 3px solid #b52733;
      padding: 6px;
      margin: 11px 0 3px;
      break-after: avoid;
    }

    .field {
      display: grid;
      grid-template-columns: 44% 56%;
      padding: 4px 6px;
      border-bottom: 1px solid #dbe3eb;
      break-inside: avoid;
      min-height: 19px;
    }

    .label {
      font-weight: bold;
      color: #4d5c6c;
    }

    .value {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .docs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      padding: 5px;
    }

    .footer {
      margin-top: 12px;
      padding-top: 7px;
      border-top: 1px solid #dbe3eb;
      font-size: 9px;
    }

    @media print {
      body {
        background: white;
      }

      .toolbar {
        display: none;
      }

      .sheet {
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 0;
      }

      .meta,
      .section-title {
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
      <title>
        Aplikimi ${esc(formatNumber(record.application_number))}
        - Besa Security
      </title>
      <style>${css}</style>
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

      <main class="sheet">

        <header class="heading">
          <div class="brand">
            <img
              class="logo"
              src="${esc(logo)}"
              alt="Besa Security"
            >
            <div>
              <strong>BESA SECURITY</strong>
              <h1>FORMULARI I APLIKIMIT PER PUNE</h1>
              <small>
                Departamenti i Burimeve Njerezore
              </small>
            </div>
          </div>

          <div class="iso">
            ISO9001:2015 &amp; ISO14001:2015
            <div><small>v.1.1</small></div>
          </div>
        </header>

        <div class="meta">
          <div>
            <strong>
              Nr. aplikimit:
              ${esc(formatNumber(record.application_number))}
            </strong>
          </div>
          <div>Data: <b>${esc(date)}</b></div>
          <div>
            Statusi:
            <b>${esc(record.status || 'I ri')}</b>
          </div>
          <div>
            Pozita:
            <b>${esc(d.pozita || '—')}</b>
          </div>
        </div>

        <h2 class="section-title">
          Te dhenat e aplikantit
        </h2>

        ${rows}

        ${extra
          ? '<h2 class="section-title">Te dhena shtese</h2>' +
            extra
          : ''}

        <h2 class="section-title">
          Dokumentet e bashkengjitura
        </h2>

        <div class="docs">
          ${docs || 'Nuk ka dokumente'}
        </div>

        <div class="footer">
          BESA SECURITY · Your safety, our promise.
        </div>

      </main>
    </body>
    </html>
  `);

  win.document.close();
}

// ============================================
// START
// ============================================

refresh();
